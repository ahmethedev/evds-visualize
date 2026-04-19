# makroturkiye — Yol Haritası

**Domain:** `makroturkiye.com` · Proje, TCMB EVDS verisinin halka açık görselleştirmesidir.

> Canlı dokümandır. Geliştirme ilerledikçe güncellenir. Son güncelleme: 2026-04-19 (Faz 3 tamamlandı; Landing dashboard 8 göstergeli IndicatorCard grid + Sparkline, `/api/dashboard` endpoint'i canlı).

---

## 1. Vizyon

TCMB'nin Elektronik Veri Dağıtım Sistemi (EVDS) şu an sadece ekonomistlerin kullanabildiği bir arayüze sahip (evds3.tcmb.gov.tr). Bu projenin amacı, aynı veriyi **genel kitle için anlaşılır ve keşfedilebilir** kılacak bir web uygulaması geliştirmek.

**Tasarım ilhamı:** [predictions.paradigm.xyz](https://predictions.paradigm.xyz/) — treemap + zaman kaydırıcısı + breadcrumb drill-down kombinasyonu. Paradigm ekibinin ifadesiyle: *"making these markets intuitive and accessible to a much wider audience."*

**Birebir aynı tasarım hedeflenmiyor** — editorial estetik (serif başlık + monospace UI, krem arkaplan, pastel doygunluk düşük bloklar) ile çerçeveyi korurken, içerikler Türkiye ekonomi verisine göre yeniden kurulacak.

---

## 2. Keşif Bulguları (2026-04-18)

EVDS API'si canlı olarak test edildi. Python `evds` paketi (fatihmete/evds) kullanılıyor.

### Kategori yapısı
- **145 kategori**, **11 temiz üst-seviye grup** + arşiv.
- Üst seviye ID'ler (10, 15, 20, 25, 30, 35, 40, 45, 50, 55) *parent* — doğrudan veri içermez.
- Asıl **datagroup**'lar 4 haneli (1501, 2005, 2501, vs.) ve 6 haneli alt kodlarda.

### Hiyerarşi gömülü
**Kritik bulgu:** Her datagroup içindeki hiyerarşi zaten `SERIE_NAME` alanında kodlanmış:

| Datagroup | Format | Örnek |
|---|---|---|
| TÜFE (`bie_tukfiy2025`) | COICOP numerik | `01. Gıda` → `011. Gıda` → `0111. Tahıllar` → `01111. Tahıllar` |
| Bütçe (`bie_kbmgel`) | Noktalı | `1.` → `1.1.` → `1.1.1.` → `1.1.1.1.` |
| TCMB Bilanço (`bie_abanlbil`) | Harf+sayı | `A.` → `A.2` → `A.2A` → `A.2Aa` → `A.2Aa1` |
| Krediler (`bie_krehacbs`) | Noktalı | `1.` → `1.1.` → `1.1.1.` |

Yani ağacı oluşturmak için ekstra metadata çağrısı yok — isim parse ediciyle çıkar.

### Matematik doğrulaması
Canlı çekilen veride **parçaların toplamı = raporlanan toplam** (treemap için kritik).

Örn. Tedavüldeki Banknotlar (2026-03):
- Toplam: 898.3 Milyar TL (raporlanan = bileşenlerin toplamı — fark yok)
- 200 TL: %87.3 (784.4 Milyar TL) ← manşet-değerinde bir gözlem
- 100 TL: %9.4 / 50 TL: %1.5 / geri kalan: %1.8

MB Rezervleri (2026-04-10):
- Toplam: $170.9B (Altın $106.8B + Döviz $64.1B)

### Treemap-uygun 9 kompozisyon
| Kod | Ad | Seri | Not |
|---|---|---|---|
| `bie_abanlbil` | TCMB Analitik Bilanço | 31 | Aktif/Pasif — klasik |
| `bie_mbblnca` | TCMB Bilançosu (Yeni) | 152 | En detaylı |
| `bie_kbmgel` | Merkezi Yönetim Bütçe Gelirleri | 111 | Vergi kırılımı |
| `bie_kbmgid` | Merkezi Yönetim Bütçe Harcamaları | 172 | Fonksiyon kırılımı |
| `bie_tukfiy2025` | TÜFE 2025 | 349 | COICOP hiyerarşisi — en hikaye-güçlü |
| `bie_krehacbs` | Krediler - Bankacılık Sektörü | 32 | Kimlere kredi gidiyor |
| `bie_pbpanal2` | Para Arzı ve Karşılık Kalemleri | 62 | M1/M2/M3 |
| `bie_abres2` | MB Rezervleri | 3 | Altın + Döviz |
| `bie_tedavultut` | Tedavüldeki Banknotlar (TL) | 8 | Halka yakın, hızlı MVP |

### Zaman serisi veri (line/dashboard için)
Kompozisyon olmayan ama halkın umurunda olanlar:
- `bie_dkdovytl` — TCMB Döviz Kurları (USD/TRY, EUR/TRY, …)
- `bie_mkaltytl` — Altın fiyatı (TRY)
- `bie_tukfiy2025.GENEL` — TÜFE genel endeks
- `bie_tufe1yi` — Yİ-ÜFE
- Politika faizi (`bie_` — lokasyonu henüz teyit edilmedi, Faz 0'da konumlandır)
- `bie_tisguc` — İşgücü Göstergeleri (işsizlik)

---

## 3. Ürün: 3-Katmanlı Yapı

### Katman 1 — "Türkiye Bugün" (Landing)
**Hedef kitle:** Mahalleli. USD/TRY ne oldu, altın ne olmuş, son enflasyon kaç?

**İçerik:** 6-8 kart — her biri büyük rakam + mini sparkline + YoY/MoM değişim.
- USD/TRY, EUR/TRY
- Gram altın
- TÜFE (YoY)
- Politika faizi
- MB Rezervleri
- İşsizlik oranı
- Cari işlemler dengesi (opsiyonel)

**Etkileşim:** Kart tıklanınca Katman 3'e (o serinin zaman grafiği) yönlenir.

### Katman 2 — "Ekonomi Haritası" (Treemap — Paradigm tarzı)
**Hedef kitle:** Meraklı vatandaş, gazeteci, öğrenci.

**İçerik:** 9 kompozisyonun seçilebildiği tek sayfa.
- Üstte segment bar: 9 kompozisyon seçeneği + arama
- Ana görsel: D3 treemap, breadcrumb ile drill-down
- Altta zaman cetveli (timeline scrubber) — seçilen tarihe göre treemap güncellenir
- Hover tooltip: değer + toplam içindeki pay + üst-düğüm içindeki pay
- View toggle: Tree / Bar / Bar% / Line (tekil seri için) / Raw data

### Katman 3 — "Seri Keşfi" (Advanced)
**Hedef kitle:** Analist, araştırmacı, power user.

**İçerik:**
- Sol: 145 kategoriyi gösteren ağaç navigasyonu + arama
- Sağ: Seçilen serinin/serilerin grafiği
- Çoklu seri karşılaştırma
- Tarih aralığı seçici, sıklık ayarı (günlük/aylık/yıllık), dönüşüm (YoY değişim, moving average)
- CSV/PNG export

---

## 4. Mimari

### Stack
| Katman | Seçim | Neden |
|---|---|---|
| Frontend | Vite + React 19 + TypeScript | Basit dockerize, SSR yok (dashboard, SEO kritik değil) |
| Router | React Router v7 | Paradigm tarzı URL drill-down için |
| Stil | Tailwind CSS | Hızlı + küçük bundle |
| Görselleştirme | D3 (d3-hierarchy, d3-selection, d3-scale) | Treemap + custom interactions |
| Font | EB Garamond (serif) + IBM Plex Mono | Ücretsiz, editorial hava |
| Backend | FastAPI (Python 3.12) | EVDS paketi Python, aynı runtime |
| EVDS client | `evds` (PyPI) | Kanıtlanmış, zaten çalışıyor |
| Cache | SQLite + bir TTL tablosu | MVP için yeterli; trafik artarsa Redis |
| Reverse proxy | nginx | Docker compose içinde, SSL termination |
| Deploy | Docker Compose → VPS | Tek komut deploy, rollback kolay |

### Dizin yapısı
```
evds_data/
├── .env                        # EVDS_API_KEY (gitignored)
├── .env.example                # Şablon
├── .gitignore
├── ROADMAP.md                  # Bu dosya
├── README.md
├── docker-compose.yml          # Prod compose
├── docker-compose.dev.yml      # Dev (hot reload)
├── nginx/
│   └── default.conf            # Reverse proxy config
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py             # FastAPI entry
│   │   ├── config.py           # Settings (env vars)
│   │   ├── evds_client.py      # evds paketinin wrapperı
│   │   ├── cache.py            # SQLite TTL cache
│   │   ├── hierarchy.py        # Seri ismi → ağaç parser
│   │   ├── routes/
│   │   │   ├── composition.py  # /api/composition/{datagroup}
│   │   │   ├── series.py       # /api/series/{code}
│   │   │   ├── dashboard.py    # /api/dashboard
│   │   │   └── catalog.py      # /api/catalog (145 kategori ağacı)
│   │   └── models.py           # Pydantic şemalar
│   └── tests/
├── frontend/
│   ├── Dockerfile              # Multi-stage: node build → nginx serve
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── routes/
│       │   ├── landing.tsx     # Katman 1
│       │   ├── map.tsx         # Katman 2
│       │   └── explorer.tsx    # Katman 3
│       ├── components/
│       │   ├── Treemap.tsx
│       │   ├── TimelineScrubber.tsx
│       │   ├── Breadcrumb.tsx
│       │   ├── Sparkline.tsx
│       │   ├── IndicatorCard.tsx
│       │   └── SeriesChart.tsx
│       ├── lib/
│       │   ├── api.ts          # Backend client
│       │   ├── hierarchy.ts    # Tree utilities
│       │   └── format.ts       # TL/USD/tarih biçimlendirme
│       └── styles/
└── explore/                    # Var olan keşif betikleri (referans, koda karışmaz)
    ├── 01_enumerate.py
    ├── 02_probe.py
    ├── 03_probe_leaves.py
    ├── 04_inspect_series.py
    ├── 05_fetch_values.py
    └── cache/                  # JSON dumpları (gitignored)
```

### Cache stratejisi
EVDS API yavaş ve rate-limit'li. SQLite cache şart.

| Endpoint tipi | TTL | Sebep |
|---|---|---|
| `main_categories`, `datagroups` | 7 gün | Nadiren değişir |
| `series_list` (bir datagroup'un serileri) | 7 gün | Yapı stabil |
| Veri (günlük sıklık) | 1 saat | Yeni değerler gün içinde yayınlanabilir |
| Veri (aylık sıklık) | 12 saat | Ay içinde değişmez |
| Veri (tarihsel — >30 gün eski) | 30 gün | Retrospektif değişmez |

İlk çağrıda EVDS'ye vurulur, cache'e yazılır, sonraki çağrılar cache'ten gelir. Cache `backend/data/cache.db` altında. Volume mount ile VPS'te kalıcı.

### API endpoint'leri (taslak)
```
GET /api/dashboard                            → Katman 1 tüm göstergeler
GET /api/catalog                              → 145 kategori ağacı
GET /api/composition/{datagroup}?date=YYYYMMDD → Katman 2 bir kompozisyonun snapshot'ı
GET /api/composition/{datagroup}/timeline     → Zaman cetveli için tarih-toplam çifti
GET /api/series/{serie_code}?start=&end=&freq= → Katman 3 tek seri
GET /api/search?q=                            → Seri arama
```

### Docker
- **Frontend Dockerfile:** multi-stage — `node:22-alpine` build → `nginx:alpine` serve statik dosyaları
- **Backend Dockerfile:** `python:3.12-slim`, uvicorn ile çalışır, healthcheck endpoint'i
- **docker-compose.yml:** backend + frontend + nginx reverse proxy (nginx dış trafiği `/api/*` → backend, diğerini frontend'e yönlendirir)
- **SSL:** VPS tarafında certbot ile nginx container'ına letsencrypt

---

## 5. Yol Haritası (Faz-faz)

Her faz sonu çalışır durumda olmalı; yarım bırakılmaz.

### Faz 0 — Setup & Scaffold ✅ (2026-04-18)
- [x] Proje dizin iskelesi (backend/, frontend/, nginx/)
- [x] `.env.example` + README stub
- [x] FastAPI "hello world" + `/healthz` endpoint
- [x] Vite + React 19 + TS + Tailwind başlangıç (landing route healthz'i çağırıyor)
- [x] Dev `docker-compose.dev.yml` (hot reload frontend + backend)
- [x] Prod `docker-compose.yml` iskeleti (nginx reverse proxy dahil)
- [x] Backend'de EVDS client wrapper + SQLite TTL cache tabanı
- [x] Vite dev proxy (`/healthz`, `/api` → backend:8000) — dev/prod URL'leri simetrik
- **Çıktı:** Native olarak `uvicorn` + `npm run dev` ile çalışır durumda teyit edildi. Docker yolu lokalde smoke test edilmedi (Docker Desktop yok); VPS'te Faz 5'te doğrulanacak.

### Faz 1 — Katman 2 MVP: Tek kompozisyon uçtan uca ✅ (2026-04-19)
- [x] Hiyerarşi parser (UST_SERIE_CODE tabanlı, flat + hiyerarşik; TÜFE COICOP ve Tedavültaki Banknotlar test edildi)
- [x] Backend: `GET /api/composition/{datagroup}` — hiyerarşik JSON döndürür
- [x] Frontend: `/map/:datagroup` route, D3 treemap component
- [x] Breadcrumb drill-down (URL `?path=` ile senkron)
- [x] Hover tooltip (değer + % pay — bu seviye ve toplam)
- [x] İlk hedef datagroup: **`bie_tedavultut`** (8 seri — 898.3 Milyar TL, 200 TL %87.3)
- [x] İkinci hedef: **`bie_tukfiy2025`** (349 seri, 13 üst grup, drill-down çalışır)
- **Çıktı:** Dev ortamda `/map/bie_tedavultut` ve `/map/bie_tukfiy2025` çalışır durumda. Native `uvicorn` + `npm run dev` ile doğrulandı. Tarayıcıda görsel teyit edilmedi (geliştirici sonraki oturumda yapacak).
- **Notlar:**
  - TÜFE'de değerler endeks olduğundan alt-dallar toplamı üst değere eşit değildir; treemap endeks değerine göre boyutlanır, frontend'de kullanıcıyı uyaran bir not görünür. Faz 2'de ağırlık-bazlı sizing eklenecek.
  - Parser hem `UST_SERIE_CODE` (sağlıklı ağaç) hem de "Toplam/Genel Endeks" isim kalıbını kullanır. 3 formatlı ada-parse gerekmedi; UST_SERIE_CODE alanı yeterli bilgi veriyor.

### Faz 2 — Katman 2 Tam: 9 kompozisyon + timeline
- [x] 9 datagroup için hiyerarşi parser doğrulandı — UST_SERIE_CODE tüm formatlarda (COICOP, noktalı, harf+sayı) çalışıyor; 3-formatlı ad-parse'a gerek yok
- [x] Segment bar — 9 kompozisyon arası geçiş (frontend/src/lib/datagroups.ts)
- [x] Tarihe göre snapshot API'si — `/api/composition/{dg}?asof=YYYY-MM-DD` zaten çalışıyor (composition route)
- [x] Parent-relative yüzde ("üst dal içinde %X") — dual-root gruplarda (bilanço, Para Arzı) doğru çalışır
- [x] Timeline scrubber component + `/api/composition/{dg}/timeline` endpoint (sparkline + drag/click + ←/→ klavye; ?asof= URL ile senkron)
- [x] View toggle: Tree / Bar / Bar% (`?view=` URL paramı ile paylaşılır)
- [x] Animasyonlu geçişler — CSS transitions `<g transform>` + rect `width`/`height` üstünde; timeline scrubbing ve view değişiminde cell'ler morph eder
- **Çıktı:** 9 kompozisyonun tamamı `/map/:datagroup` altında çalışır. Tree (d3 treemap), Bar (genişlik ∝ değer, en büyük = tam genişlik), Bar% (genişlik ∝ toplam payı) görünümleri arası geçiş yumuşak animasyonla. Timeline scrubber ile geçmiş tarihlere drill-down.
- **Notlar:**
  - 3 datagroup (`bie_abanlbil`, `bie_mbblnca`, `bie_pbpanal2`) iki paralel hiyerarşi içeriyor (AKTİF/PASİF; G-series/H-series). Şu an sibling gösteriliyor — ileride "view seçici" ile temizlenebilir.
  - `bie_kbmgel`, `bie_kbmgid` "Toplam" satırı içermez (source="sum"); UI'da bir not gösteriliyor.
  - Timeline endpoint default 5 yıl (override: `?years=N`); her tarih için `build_tree` çağırarak snapshot ile aynı toplam mantığını kullanır. d3-brush yerine HTML pointer events + SVG sparkline (daha az bağımlılık, aynı UX).
  - Doğrulama betikleri: `explore/06_validate_datagroups.py`, `explore/07_inspect_tree.py`.

### Faz 3 — Katman 1: Landing dashboard ✅ (2026-04-19)
- [x] Seri kodları tespit edildi (`explore/08_find_indicators.py` + `explore/cache/indicators.json`) — 8 gösterge: USD/TRY, EUR/TRY, gram altın, TÜFE YoY, politika faizi (TP.APIFON4), MB rezervi, işsizlik, cari denge
- [x] Backend `GET /api/dashboard` — 8 indicator paralel olmadan ama SQLite cache'le hızlı; value + MoM/YoY değişim + 12–24 aylık sparkline döner. `yoy_pct` transform TÜFE için value'yu YoY % olarak verir, MoM değişimi pp cinsinden
- [x] Indicator config `backend/app/indicators.py` (TypedDict + ORDER listesi)
- [x] Frontend: `Sparkline.tsx` (SVG, 160×36 default, üstte line + altta soft area), `IndicatorCard.tsx` (Link → /map/:datagroup), `routes/landing.tsx` tamamen yeniden yazıldı
- [x] Responsive grid (sm:2, lg:4 kolon), skeleton loading, tarih gösterimi TR
- [x] Kart tıklama şimdilik `/map/:datagroup`'a (Katman 3 Faz 4'te)
- [x] Cache stratejisi mevcut: SQLite `values:*` TTL (daily=1h, monthly=12h) — ilk çağrıda EVDS'ye vurur, sonrası cache
- **Çıktı:** `/` adresinde 8 göstergeli landing; `vite build` temiz, backend 8/8 indicator döndürüyor (USD/TRY 44.68, TÜFE YoY 30.9%, politika faizi 40%, rezerv 170.9B USD). Tarayıcı doğrulaması sonraki oturumda.
- **Notlar:**
  - Politika faizi için `TP.APIFON4` (TCMB Ağırlıklı Ortalama Fonlama Maliyeti) seçildi — günlük yayınlanır ve resmi 1-hafta repo ilan faizinden daha konuşkan; journalism-friendly.
  - Gram altın `TP.MK.KUL.YTL` (Külçe, TL/Gr) — `TP.MK.CUM.YTL` (Cumhuriyet altını) yerine tercih edildi çünkü halkın bildiği fiyat gramlık.
  - Cari denge `TP.ODEAYRSUNUM6.Q1` (1.Cari İşlemler Hesabı) — negatif değer kırmızı görünüyor (dashboard kodlaması pozitif/negatif fark).

### Faz 4 — Katman 3: Series Explorer
- [x] 145 kategori ağacı (lazy load — `/api/catalog` + `/api/catalog?parent=`, üst seviye ⇾ subcat ⇾ datagroup ⇾ series, 7 günlük cache)
- [x] Seri çizme: tekil line chart (`/api/series/{code}` + `SeriesChart.tsx`, SVG line + hover tooltip)
- [ ] Arama (backend full-text, SQLite FTS5)
- [ ] Çoklu seri karşılaştırma (aynı eksen / iki eksen seçeneği)
- [ ] Tarih aralığı, frekans, formül (YoY %, MA) kontrolleri
- [ ] CSV + PNG export
- **Çıktı (kısmi, 2026-04-19):** `/explorer` route çalışır — sol lazy ağaç, sağ tekil line chart. `npx tsc --noEmit` + `vite build` temiz.

### Faz 5 — Polish & Deploy
- [ ] Typography ince ayar (EB Garamond + IBM Plex Mono yüklenip kullanılır)
- [ ] Dark mode (opsiyonel — Paradigm yalnız light tema)
- [ ] i18n scaffold (TR default, EN opsiyonel — EVDS `lang="ENG"` destekliyor)
- [ ] Performance: bundle analizi, code splitting, image lazy load
- [ ] VPS'e ilk deploy + domain + SSL (certbot)
- [ ] Analytics (Plausible veya basit self-hosted)
- [ ] Error tracking (Sentry self-host veya log)
- **Çıktı:** Canlı, public URL

### Faz 6+ — Sonrası (tartışılacak)
- Bookmark / link paylaşma özelliği
- "Bugün TÜFE'ye en çok katkı yapan kalemler" gibi otomatik hikayeler
- Mobile-native deneyim
- RSS / email bülten

---

## 6. Güncel Durum

| Konu | Durum |
|---|---|
| Marka / domain | ✅ `makroturkiye` — `makroturkiye.com` (alınacak) |
| API key | ✅ Aktif, `.env` içinde |
| `evds` paketi | ✅ PyPI'den kurulu, test edildi |
| Keşif | ✅ Tamamlandı, `explore/cache/` JSON'lar var |
| Kompozisyon matematiği | ✅ Doğrulandı |
| ROADMAP | ✅ Bu dosya |
| Faz 0 | ✅ Tamamlandı (2026-04-18) |
| Faz 1 | ✅ Tamamlandı (2026-04-19) — `bie_tedavultut` + `bie_tukfiy2025` |
| Faz 2 | ✅ Tamamlandı (2026-04-19) — segment bar, 9 kompozisyon, timeline scrubber, view toggle (Tree/Bar/Bar%), CSS-transition morph animasyonları |
| Faz 3 | ✅ Tamamlandı (2026-04-19) — Landing dashboard 8 göstergeli IndicatorCard + Sparkline, `/api/dashboard`, responsive grid |
| Faz 4 | 🟡 Devam — kategori ağacı (lazy) + tek seri line chart canlı; arama, çoklu seri, transformlar, export kaldı |

---

## 7. Açık Sorular / Kararlar

| Soru | Karar / Not |
|---|---|
| Port planı | Dev: backend 8000, frontend 5173. Prod: nginx 80/443, iç network. |
| Redis? | Hayır — SQLite ile başla, darboğaz olursa geç |
| Auth? | Hayır — public site, rate limit backend'de |
| Politika faizi serisi kodu | ✅ `TP.APIFON4` (bie_apifon) — TCMB Ağırlıklı Ortalama Fonlama Maliyeti, günlük |
| Cari açık serisi kodu | ✅ `TP.ODEAYRSUNUM6.Q1` (bie_odeayrsunum6) — 1.Cari İşlemler Hesabı, aylık |
| Dil | Default TR, EN opsiyonel (Faz 5) |
| Monorepo mu ayrı repo mu | Monorepo (tek Docker compose, basit) |
| Backend paketleme | ✅ `uv` (hızlı, `uv.lock` reproducible) |

---

## 8. Yasal Uyum (EVDS Kullanım Şartları + Gizlilik Politikası)

EVDS Kullanım Şartları (evds3.tcmb.gov.tr) incelendi — izin verilen kapsamda kalıyoruz. Uyum için yapılanlar ve kısıtlar:

### Yapılan
- [x] **Kaynak gösterimi:** Her sayfanın altında `Disclaimer` componenti — "Kaynak: TCMB EVDS (evds3.tcmb.gov.tr)" linkli. Explorer üst bar'da da açık kaynak etiketi.
- [x] **TCMB'den bağımsız olduğu açıklaması:** "makroturkiye bağımsız bir projedir; TCMB ile resmi bağlantısı yoktur" — her footer'da.
- [x] **"Yatırım tavsiyesi değildir" uyarısı** (madde 2 gereği).
- [x] **Sorumluluk sınırlaması** (madde 3 gereği) — verilerin doğruluğu/güncelliği için resmi kaynak EVDS'dir notu.

### İleride tetiklenecek (şu an gerekmiyor)
- **EN çeviri yapılırsa** (Faz 5 i18n): "TCMB'nin resmi çevirisi değildir" notu eklenmeli (madde 2).
- **Analytics / cookie / üyelik eklenirse:** KVKK uyumlu gizlilik politikası + çerez banner'ı + "Profil/Hesap" ekranı gerekir. Şu an sıfır kullanıcı verisi toplandığı için yok.
- **Monetizasyon:** Madde 2 "EVDS verisi için ek ücret yansıtılmaz" der — genel SaaS aboneliği OK, ancak "EVDS verisine erişim için öde" paketi yapılamaz. Bu kararı Faz 6+ ticari plan aşamasında tekrar oku.
- **Hukuki/iletişim sayfası** (opsiyonel, /hakkinda route): Faz 5 polish içinde eklenebilir — projenin sahibi, iletişim e-postası, tam disclaimer metni.

### Yapmayacağımız şeyler (şartnameye aykırı olur)
- Verileri TCMB'den geliyormuş gibi doğrudan brand kullanımı (logo, "resmi TCMB verisi" ibaresi vb.)
- Yatırım/al-sat tavsiyesi formatında sunum.
- EVDS verisinin "özel sürüm" olduğu iddiası.

---

## 9. İlkeler (geliştirme sırasında hatırlanacak)

1. **Halk için tasarla.** Her ekranda "tetede benim ablam bunu anlar mı?" testini geç.
2. **Hız > güzellik.** Düşük bağlantıda bile 3 saniyede açılsın.
3. **Cache agresif.** EVDS yavaş, bizim API hızlı olmak zorunda.
4. **Çalışır durumda kal.** Her fazın sonunda deploy edilebilir bir şey olsun.
5. **Paradigm ilham, kopya değil.** Türkiye'ye özgü hikayeler (200 TL %87 gibi) öne çıksın.

---

*Dosya canlıdır. Değişiklikler commit mesajında ya da not bırakılarak yapılabilir.*
