"use client";

import { useEffect, useMemo, useState } from "react";
import { useJiraProjects } from "./useJiraProjects";
import { Projects } from "@/app/types/jira";
import { Report } from "@/app/types/report";

type Props = {
  open: boolean;
  onClose: () => void;
  report: Report;
};

type TicketIssue = { id: string; key: string };
type TicketCreationOk = { created: number; issues: TicketIssue[] };
type TicketCreationErr = { error: string; details?: string };
type TicketCreationState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; payload: TicketCreationOk }
  | { kind: "error"; payload: TicketCreationErr };

export default function BacklogModal({ open, onClose, report }: Props) {
  const { state, fetchProjects } = useJiraProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [submit, setSubmit] = useState<TicketCreationState>({ kind: "idle" });

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
          error: (json as { error?: string })?.error ?? "Ticket creation failed",
          details: (json as { details?: string })?.details,
        };
        setSubmit({ kind: "error", payload });
        return;
      }

      const payload = json as TicketCreationOk;
      setSubmit({ kind: "ok", payload });
    } catch (e) {
      setSubmit({
        kind: "error",
        payload: { error: "Unexpected error", details: e instanceof Error ? e.message : undefined },
      });
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Create backlog in Jira</h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm hover:bg-neutral-200 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {state.kind === "loading" && <p className="text-sm text-gray-500">Loading projects…</p>}
        {state.kind === "error" && (
          <p className="text-sm text-red-600">Error: {state.message}</p>
        )}
        {state.kind === "loaded" && values.length === 0 && (
          <p className="text-sm text-gray-600">No Jira projects found.</p>
        )}

        {values.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              {values.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
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
                      <div className="text-xs text-gray-500">Key: {p.key}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    {p.projectTypeKey} • {p.style} • {p.isPrivate ? "Private" : "Public"}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm border hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                disabled={!selectedProjectId || submit.kind === "loading"}
                onClick={() => selectedProjectId && createTickets(selectedProjectId)}
                className="rounded-md px-4 py-2 text-sm bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
              >
                {submit.kind === "loading" ? "Creating…" : "Create tickets"}
              </button>
            </div>

            {submit.kind === "ok" && (
              <p className="mt-3 text-sm text-green-600">
                {submit.payload.created} ticket(s) created:{" "}
                {submit.payload.issues.map((i) => i.key).join(", ")}
              </p>
            )}
            {submit.kind === "error" && (
              <p className="mt-3 text-sm text-red-600">
                {submit.payload.error}
                {submit.payload.details ? ` – ${submit.payload.details}` : ""}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}