const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export type Health = {
  status: string;
  evds_api_key_loaded: boolean;
  cache_purged: number;
};
