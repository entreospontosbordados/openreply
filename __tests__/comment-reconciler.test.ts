/**
 * Comment reconciliation — ad copies of a boosted post.
 *
 * Comments left on an ad carry the ad's own media id, so the sweep has to look
 * at those media too or a webhook Meta never delivers is lost for good.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, queueAdd, readComments, readMedia } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn(),
    automation: { findMany: vi.fn() },
    dmLog: { findMany: vi.fn() },
    operationalEvent: { create: vi.fn() },
  },
  queueAdd: vi.fn(),
  readComments: vi.fn(),
  readMedia: vi.fn(),
}));
vi.mock("@/lib/queue/client", () => ({
  getDMQueue: () => ({ add: queueAdd }),
}));
vi.mock("@/lib/instagram/provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/instagram/provider")>()),
  createInstagramContext: async () => ({
    provider: "META",
    accessToken: "local-test",
  }),
  getRecentMediaComments: readComments,
  getUserMedia: readMedia,
}));

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));

import {
  adMediaFor,
  reconcileComments,
} from "../lib/polling/comment-reconciler";

const POST = "18023946917554990";
const AD = "17899788633163100";

describe("adMediaFor", () => {
  beforeEach(() => {
    mockPrisma.$queryRaw.mockReset();
  });

  it("returns the ad media ids seen for the post", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ mediaId: AD }]);
    await expect(adMediaFor(POST)).resolves.toEqual([AD]);
  });

  it("never returns the post itself, so it is not swept twice", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      { mediaId: AD },
      { mediaId: POST },
    ]);
    await expect(adMediaFor(POST)).resolves.toEqual([AD]);
  });

  it("drops rows without a media id", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      { mediaId: null },
      { mediaId: AD },
    ]);
    await expect(adMediaFor(POST)).resolves.toEqual([AD]);
  });

  it("returns nothing when the post was never boosted", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);
    await expect(adMediaFor(POST)).resolves.toEqual([]);
  });

  it("swallows a query failure, leaving the post itself still swept", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error("connection lost"));
    await expect(adMediaFor(POST)).resolves.toEqual([]);
  });
});

describe("comment polling does not recreate unsafe sends", () => {
  beforeEach(() => {
    queueAdd.mockReset();
    mockPrisma.operationalEvent.create.mockResolvedValue({});
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.automation.findMany.mockResolvedValue([
      {
        id: "campaign",
        name: "Campaign",
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        workspaceId: "workspace",
        postId: POST,
        matchAnyWord: false,
        keywords: ["AI"],
        publicReplyEnabled: true,
        instagramAccount: {
          id: "connection",
          instagramId: "owner",
          provider: "META",
          accessToken: "test",
        },
      },
    ]);
    readComments.mockResolvedValue([
      {
        id: "old",
        text: "AI",
        from: { id: "reader" },
        timestamp: new Date().toISOString(),
      },
      {
        id: "new",
        text: "AI",
        from: { id: "another-reader" },
        timestamp: new Date().toISOString(),
      },
    ]);
  });
  it.each([
    { status: "FAILED", attempts: 1, dmDeliveryUnconfirmed: true },
    { status: "FAILED", attempts: 3, dmDeliveryUnconfirmed: false },
    {
      status: "FAILED",
      attempts: 1,
      errorMessage: "MetaApiError 1: An unknown error has occurred.",
    },
    { status: "PENDING", attempts: 1, dmDeliveryUnconfirmed: true },
  ])(
    "leaves an unsafe old comment alone while continuing new comments: %j",
    async (state) => {
      mockPrisma.dmLog.findMany.mockResolvedValue([
        { commentId: "old", publicReplySentAt: new Date(), ...state },
      ]);
      await reconcileComments();
      await reconcileComments();
      expect(queueAdd).toHaveBeenCalledTimes(2);
      for (const [, data] of queueAdd.mock.calls)
        expect(data.commentId).toBe("new");
    },
  );
});

 describe("campaign polling window", () => {
  afterEach(() => vi.restoreAllMocks());
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-05-01T12:00:00Z"));
    queueAdd.mockReset();
    mockPrisma.$queryRaw.mockResolvedValue([{ mediaId: AD }]);
    mockPrisma.dmLog.findMany.mockResolvedValue([]);
    mockPrisma.operationalEvent.create.mockResolvedValue({});
  });
  it.each([30 / 60, 30 * 24])("applies the effective window to posts and ads for age %s hours", async (ageHours) => {
    const createdAt = new Date(Date.now() - ageHours * 3600000);
    const sinceMs = Math.max(createdAt.getTime(), Date.now() - 72 * 3600000);
    mockPrisma.automation.findMany.mockResolvedValue([{ id: "campaign", name: "Campaign", createdAt, postId: POST, keywords: ["AI"], instagramAccount: { id: "connection", instagramId: "owner" } }]);
    readComments.mockResolvedValue([
      ...Array.from({ length: 35 }, (_, i) => ({ id: `old${i}`, text: "AI", from: { id: "reader" }, timestamp: new Date(sinceMs - 1).toISOString() })),
      { id: "invalid", text: "AI", from: { id: "reader" }, timestamp: "invalid" },
      { id: "equal", text: "AI", from: { id: "reader" }, timestamp: new Date(sinceMs).toISOString() },
    ]);
    await reconcileComments();
    expect(readComments).toHaveBeenCalledWith(expect.objectContaining({ mediaId: POST, sinceMs }));
    expect(readComments).toHaveBeenCalledWith(expect.objectContaining({ mediaId: AD, sinceMs }));
    expect(queueAdd).toHaveBeenCalledTimes(2);
    expect(queueAdd).toHaveBeenCalledWith("process-comment", expect.objectContaining({ commentId: "equal", commentCreatedAt: new Date(sinceMs).toISOString() }));
    vi.restoreAllMocks();
  });
 });

 it("uses the creation boundary for any-post campaigns", async () => {
  queueAdd.mockReset();
  const createdAt = new Date("2026-10-04T12:00:00.123Z");
  vi.spyOn(Date, "now").mockReturnValue(createdAt.getTime() + 1800000);
  mockPrisma.automation.findMany.mockResolvedValue([{ id: "any", name: "Any", createdAt, postId: null, matchAnyPost: true, matchAnyWord: true, instagramAccount: { id: "connection", instagramId: "owner" } }]);
  readMedia.mockResolvedValue([{ id: POST }]);
  readComments.mockResolvedValue([{ id: "new", text: "AI", timestamp: createdAt.toISOString(), from: { id: "reader" } }]);
  mockPrisma.dmLog.findMany.mockResolvedValue([]);
  await reconcileComments();
  expect(readComments).toHaveBeenLastCalledWith(expect.objectContaining({ mediaId: POST, sinceMs: createdAt.getTime() }));
  expect(queueAdd).toHaveBeenCalledTimes(1);
  vi.restoreAllMocks();
 });
