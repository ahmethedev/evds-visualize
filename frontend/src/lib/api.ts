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

export type TimelinePoint = { date: string; total: number };

export type Timeline = {
  datagroup: string;
  total_source: "reported" | "sum" | null;
  points: TimelinePoint[];
};

export type IndicatorSparkPoint = { date: string; value: number };

export type Indicator = {
  key: string;
  label: string;
  name: string;
  unit: string;
  freq: "daily" | "weekly" | "monthly";
  datagroup: string;
  series_code: string;
  transform: "latest" | "yoy_pct";
  value: number | null;
  asof: string | null;
  sparkline: IndicatorSparkPoint[];
  change_mom: number | null;
  change_yoy: number | null;
  change_mom_pct: number | null;
  change_yoy_pct: number | null;
};

export type Dashboard = {
  indicators: Indicator[];
  errors: Record<string, string> | null;
};

export type CatalogNodeType = "category" | "datagroup" | "series";

export type CatalogNode = {
  id: string;
  label: string;
  type: CatalogNodeType;
  has_children: boolean;
  freq?: string | null;
  source?: string | null;
  start?: string | null;
  end?: string | null;
  datagroup?: string | null;
};

export type CatalogResponse = {
  parent: string | null;
  children: CatalogNode[];
};

export type SeriesPoint = { date: string; value: number };

export type SearchHit = {
  code: string;
  name: string;
  datagroup: string;
  datagroup_name: string;
};

export type SearchResponse = {
  query: string;
  results: SearchHit[];
  index_ready: boolean;
  index_building: boolean;
  index_count: number;
};

export type SeriesResponse = {
  code: string;
  datagroup: string | null;
  name: string | null;
  freq: string | null;
  start: string | null;
  end: string | null;
  source: string | null;
  points: SeriesPoint[];
};
