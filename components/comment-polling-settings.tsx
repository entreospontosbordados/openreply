"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";

interface PollingSettings {
  lookbackHours: number | null;
  maxPerSweep: number | null;
}

export function CommentPollingSettings() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<PollingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/settings/polling", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (payload.success && payload.data) setData(payload.data);
      } catch {
        // Leave values unavailable when the request fails.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  function display(value: number | null | undefined, hours = false) {
    if (loading) return t("Loading polling settings...");
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return t("Polling setting unavailable");
    }
    const count = value.toLocaleString(locale);
    return hours ? t("{count} hours", { count }) : count;
  }

  return (
    <section className="panel rounded p-4 sm:p-6" aria-busy={loading}>
      <h2 className="text-base font-semibold mb-6">{t("Comment polling")}</h2>
      <dl className="space-y-4">
        <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
          <dt className="min-w-0">
            <span className="text-sm font-medium">{t("Lookback window")}</span>
            <code className="block mt-1 text-xs text-muted break-all">COMMENT_POLL_LOOKBACK_HOURS</code>
            <p className="mt-1 text-xs text-muted">{t("Considers recent comments, no earlier than the campaign creation date.")}</p>
          </dt>
          <dd className="shrink-0 text-sm font-semibold">{display(data?.lookbackHours, true)}</dd>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <dt className="min-w-0">
            <span className="text-sm font-medium">{t("Limit per sweep")}</span>
            <code className="block mt-1 text-xs text-muted break-all">COMMENT_POLL_MAX_PER_SWEEP</code>
            <p className="mt-1 text-xs text-muted">{t("Maximum new comments queued per campaign in each sweep.")}</p>
          </dt>
          <dd className="shrink-0 text-sm font-semibold">{display(data?.maxPerSweep)}</dd>
        </div>
      </dl>
      <p className="mt-6 border-t border-border pt-4 text-xs text-muted">
        {t("Read-only global settings from the web server environment. Change the environment variables and restart the web and worker services to apply changes.")}
      </p>
    </section>
  );
}
