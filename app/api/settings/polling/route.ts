import { NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getCommentPollingConfig } from "@/lib/polling/config";

export async function GET() {
  if (!(await getCurrentWorkspaceId())) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const config = getCommentPollingConfig();
  return NextResponse.json(
    {
      success: true,
      data: {
        lookbackHours: Number.isFinite(config.lookbackHours) ? config.lookbackHours : null,
        maxPerSweep: Number.isFinite(config.maxPerSweep) ? config.maxPerSweep : null,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
