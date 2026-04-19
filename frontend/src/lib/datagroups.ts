export type UnitMode = "currency" | "index";

export type DatagroupMeta = {
  code: string;
  label: string;
  unit: UnitMode;
  note?: string;
};

export const DATAGROUPS: DatagroupMeta[] = [
  { code: "bie_tedavultut", label: "Tedavüldeki Banknotlar", unit: "currency" },
  { code: "bie_abres2", label: "MB Rezervleri", unit: "currency" },
  { code: "bie_krehacbs", label: "Krediler", unit: "currency" },
  { code: "bie_pbpanal2", label: "Para Arzı", unit: "currency",
    note: "İki paralel gösterim (G: karşılıklar, H: M1/M2/M3) aynı miktarı farklı açılardan parçalar." },
  { code: "bie_kbmgel", label: "Bütçe Gelirleri", unit: "currency" },
  { code: "bie_kbmgid", label: "Bütçe Harcamaları", unit: "currency" },
  { code: "bie_abanlbil", label: "TCMB Analitik Bilanço", unit: "currency",
    note: "AKTİF ve PASİF iki eşit dal; toplam = tek taraf." },
  { code: "bie_mbblnca", label: "TCMB Bilançosu", unit: "currency",
    note: "AKTİF ve PASİF iki eşit dal; toplam = tek taraf." },
  { code: "bie_tukfiy2025", label: "TÜFE 2025", unit: "index" },
];

export const DEFAULT_DATAGROUP = "bie_tedavultut";

export function getDatagroup(code: string): DatagroupMeta | undefined {
  return DATAGROUPS.find((d) => d.code === code);
}
