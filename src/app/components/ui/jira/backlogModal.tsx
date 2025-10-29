"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useJiraProjects } from "./useJiraProjects";
import { Projects } from "@/app/types/jira";
import { Report } from "@/app/types/report";
import { Button } from "../utilities";
import { useTranslations } from "next-intl";

type Props = {
  open: boolean;
  onClose: () => void;
  report: Report;
};

type TicketIssue = { id: string; key: string; summary: string; url: string };
type TicketCreationOk = { created: number; issues: TicketIssue[] };
type TicketCreationErr = { error: string; details?: string };
type TicketCreationState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; payload: TicketCreationOk }
  | { kind: "error"; payload: TicketCreationErr };

export default function BacklogModal({ open, onClose, report }: Props) {
  const t = useTranslations("Jira.modal");
  const { state, fetchProjects } = useJiraProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [submit, setSubmit] = useState<TicketCreationState>({ kind: "idle" });
  const [history, setHistory] = useState<TicketIssue[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const historyAbortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async (projectId: string) => {
    historyAbortRef.current?.abort();
    const ctrl = new AbortController();
    historyAbortRef.current = ctrl;

    setHistory(null);
    setHistoryError(null);
    setHistoryLoading(true);

    try {
      const params = new URLSearchParams({ projectId, max: "10" });
      const res = await fetch(`/api/jira/history?${params.toString()}`, {
        cache: "no-store",
        signal: ctrl.signal,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load history");
      setHistory(json.issues as TicketIssue[]);
    } catch (e) {
      if ((e as DOMException)?.name !== "AbortError") {
        setHistoryError(e instanceof Error ? e.message : "Error");
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // fetch on open
  useEffect(() => {
    if (open) fetchProjects();
  }, [open, fetchProjects]);

  const values = useMemo<Projects["values"]>(() => {
    return state.kind === "loaded" ? state.data.values : [];
  }, [state]);

  const createTickets = async (projectId: string) => {
    setSubmit({ kind: "loading" });
    try {
      const res = await fetch("/api/jira/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, report }),
      });
      const json: unknown = await res.json();

      if (!res.ok) {
        const payload: TicketCreationErr = {
          error:
            (json as { error?: string })?.error ?? "Ticket creation failed",
          details: (json as { details?: string })?.details,
        };
        setSubmit({ kind: "error", payload });
        return;
      }

      const payload = json as TicketCreationOk;
      loadHistory(projectId);
      setSubmit({ kind: "ok", payload });
    } catch (e) {
      setSubmit({
        kind: "error",
        payload: {
          error: "Unexpected error",
          details: e instanceof Error ? e.message : undefined,
        },
      });
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-400 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/60"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-3xl rounded-2xl bg-[rgb(var(--color-card))] text-[rgb(var(--color-foreground))] border-(--border-20) p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t("title")}</h2>
          <Button onClick={onClose} aria-label={t("close")}>
            ✕
          </Button>
        </div>

        {/* Body */}
        {state.kind === "loading" && (
          <p className="text-sm text-gray-500">{t("loading")}</p>
        )}
        {state.kind === "error" && (
          <p className="text-sm text-red-600">
            {t("error", { msg: state.message })}
          </p>
        )}
        {state.kind === "loaded" && values.length === 0 && (
          <p className="text-sm text-gray-600">{t("empty")}</p>
        )}

        {values.length > 0 && (
          <div className="mt-3 flex flex-col">
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              {values.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    loadHistory(p.id);
                    setSubmit({ kind: "idle" });
                  }}
                  className={[
                    "text-left rounded-xl border p-4 shadow transition",
                    selectedProjectId === p.id
                      ? "ring-2 ring-blue-600 border-blue-600"
                      : "hover:border-neutral-400",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    {p.avatarUrls?.["24x24"] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.avatarUrls["24x24"]}
                        alt={`${p.name} avatar`}
                        className="w-6 h-6 rounded"
                      />
                    )}
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-gray-500">
                        {t("key", { key: p.key })}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    {p.projectTypeKey} • {p.style} •{" "}
                    {p.isPrivate ? t("privacyPrivate") : t("privacyPublic")}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-between flex-row-reverse gap-2">
              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-2">
                  <Button onClick={onClose}>{t("cancel")}</Button>
                  <Button
                    disabled={!selectedProjectId || submit.kind === "loading"}
                    onClick={() =>
                      selectedProjectId && createTickets(selectedProjectId)
                    }
                    className="bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
                  >
                    {submit.kind === "loading"
                      ? t("creating")
                      : t("createTickets")}
                  </Button>
                </div>
              </div>
              {selectedProjectId && (
                <div
                  className="
                    bottom-4 left-4 z-10
                    w-64 max-w-[80%]
                    rounded-lg border-(--border-20)
                    bg-[rgb(var(--color-card))] text-[rgb(var(--color-foreground))]
                    shadow-md p-3
                  "
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold">
                      {t("createdBy")}
                      <span className="text-blue-600">DebtCheck</span>
                    </span>
                    <span className="text-[10px] opacity-60">
                      {t("recent")}
                    </span>
                  </div>

                  {historyLoading && (
                    <p className="text-[11px] opacity-70">
                      {t("historyLoading")}
                    </p>
                  )}
                  {historyError && (
                    <p className="text-[11px] text-red-600 leading-snug">
                      {historyError}
                    </p>
                  )}
                  {history && history.length === 0 && (
                    <p className="text-[11px] opacity-70">
                      {t("historyEmpty")}
                    </p>
                  )}

                  {history && history.length > 0 && (
                    <ul className="max-h-32 overflow-auto">
                      {history.slice(0, 5).map((i) => (
                        <li
                          key={i.id}
                          className="flex items-start gap-2 rounded px-2 py-1 text-[11px] hover:bg-black/5 cursor-pointer"
                          onClick={() => i.url && window.open(i.url, "_blank")}
                          title={i.summary}
                        >
                          <span className="font-mono text-blue-600">
                            {i.key}
                          </span>
                          <span className="opacity-80 truncate">
                            {i.summary}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {submit.kind === "ok" && (
              <p className="mt-3 text-sm text-green-600">
                {t("createdSummary", {
                  count: submit.payload.created,
                  keys: submit.payload.issues.map((i) => i.key).join(", "),
                })}
              </p>
            )}
            {submit.kind === "error" && (
              <p className="mt-3 text-sm text-red-600">
                {t("createError", {
                  msg: submit.payload.error,
                  details: submit.payload.details ?? "",
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
