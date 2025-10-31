import type { Report } from "@/app/types/report";

const PREFIX = "report:";

export function makeReportKey(id: string) {
  return `${PREFIX}${id}`;
}

function pickStore(ephemeral: boolean) {
  return ephemeral ? sessionStorage : localStorage;
}

export function saveReportToStorage(
  id: string,
  data: Report,
  { ephemeral }: { ephemeral: boolean }
) {
  const payload = JSON.stringify({ savedAt: Date.now(), data });
  pickStore(ephemeral).setItem(makeReportKey(id), payload);
}

export function loadReportFromStorage(id: string): Report | null {
  const raw =
    localStorage.getItem(makeReportKey(id)) ??
    sessionStorage.getItem(makeReportKey(id));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed.data ?? parsed; // tolerate both shapes
  } catch {
    return null;
  }
}

export function findLatestReportId(): string | null {
  const items: { id: string; savedAt: number }[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (!k.startsWith(PREFIX)) continue;
    try {
      const { savedAt } = JSON.parse(localStorage.getItem(k)!);
      items.push({ id: k.slice(PREFIX.length), savedAt: savedAt ?? 0 });
    } catch {}
  }

  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i)!;
    if (!k.startsWith(PREFIX)) continue;
    try {
      const { savedAt } = JSON.parse(sessionStorage.getItem(k)!);
      items.push({ id: k.slice(PREFIX.length), savedAt: savedAt ?? 0 });
    } catch {}
  }

  if (!items.length) return null;
  items.sort((a, b) => b.savedAt - a.savedAt);
  return items[0].id;
}

export function timeAgo(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export type StoredReportMeta = { id: string; savedAt: number };
export function latestReportMeta(): StoredReportMeta | null {
  const id = findLatestReportId();
  if (!id) return null;
  const raw =
    localStorage.getItem(makeReportKey(id)) ??
    sessionStorage.getItem(makeReportKey(id));
  if (!raw) return null;
  try {
    const { savedAt } = JSON.parse(raw);
    return { id, savedAt: savedAt ?? 0 };
  } catch {
    return null;
  }
}