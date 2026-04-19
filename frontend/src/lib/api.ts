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

export type CompositionNode = {
  code: string;
  name: string;
  raw_name: string;
  value: number | null;
  children: CompositionNode[];
};

export type Composition = {
  datagroup: string;
  asof: string | null;
  root: CompositionNode;
  total: number;
  total_source: "reported" | "sum";
  reported_total: number | null;
  sum_of_components: number;
};
