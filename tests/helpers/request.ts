export function makeReq(url: string, init?: RequestInit) {
  return new Request(url, init);
}
export async function readJson<T = unknown>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}