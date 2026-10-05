/** Shared runtime configuration; preserve the reconciler's Number conversion. */
export function getCommentPollingConfig() {
  return {
    lookbackHours: Number(process.env.COMMENT_POLL_LOOKBACK_HOURS ?? 72),
    maxPerSweep: Number(process.env.COMMENT_POLL_MAX_PER_SWEEP ?? 30),
  };
}
