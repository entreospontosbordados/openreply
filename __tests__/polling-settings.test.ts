import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { workspaceId } = vi.hoisted(() => ({ workspaceId: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentWorkspaceId: workspaceId }));

import { GET } from "@/app/api/settings/polling/route";
import { getCommentPollingConfig } from "@/lib/polling/config";

beforeEach(() => {
  workspaceId.mockResolvedValue("workspace-test");
  vi.stubEnv("COMMENT_POLL_LOOKBACK_HOURS", undefined);
  vi.stubEnv("COMMENT_POLL_MAX_PER_SWEEP", undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("comment polling settings", () => {
  it("uses the reconciler defaults only when variables are absent", () => {
    expect(getCommentPollingConfig()).toEqual({ lookbackHours: 72, maxPerSweep: 30 });
    vi.stubEnv("COMMENT_POLL_LOOKBACK_HOURS", "");
    vi.stubEnv("COMMENT_POLL_MAX_PER_SWEEP", "0");
    expect(getCommentPollingConfig()).toEqual({ lookbackHours: 0, maxPerSweep: 0 });
  });

  it("reads custom values at request time and exposes only the two settings", async () => {
    vi.stubEnv("COMMENT_POLL_LOOKBACK_HOURS", "24");
    vi.stubEnv("COMMENT_POLL_MAX_PER_SWEEP", "12");
    const response = await GET();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      success: true, data: { lookbackHours: 24, maxPerSweep: 12 },
    });
    vi.stubEnv("COMMENT_POLL_LOOKBACK_HOURS", "48");
    expect((await (await GET()).json()).data.lookbackHours).toBe(48);
  });

  it("returns null for non-finite settings instead of showing defaults", async () => {
    vi.stubEnv("COMMENT_POLL_LOOKBACK_HOURS", "invalid");
    vi.stubEnv("COMMENT_POLL_MAX_PER_SWEEP", "Infinity");
    expect(await (await GET()).json()).toEqual({
      success: true, data: { lookbackHours: null, maxPerSweep: null },
    });
  });

  it("requires an authenticated workspace", async () => {
    workspaceId.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ success: false, error: "Unauthorized" });
  });
});
