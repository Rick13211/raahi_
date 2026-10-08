<div align="center">

<br/>

# 🧭 Raahi

### *Safety-Aware Navigation for India*

<p align="center">
  <strong>Don't just find the fastest route — find the safest one.</strong><br/>
  Raahi scores every route 0–100 using real-time safety signals before you take a single step.
</p>

<br/>

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-raahi--hazel.vercel.app-0070f3?style=for-the-badge)](https://raahi-hazel.vercel.app/)
&nbsp;
[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
&nbsp;
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
&nbsp;
[![Mapbox](https://img.shields.io/badge/Mapbox-000000?style=for-the-badge&logo=mapbox&logoColor=white)](https://mapbox.com/)

<br/>

</div>

---

## 🤔 What is Raahi?

Most navigation apps tell you how to get somewhere. Raahi tells you **how safe it is to get there.**

Built specifically for Indian cities, Raahi fetches up to 3 alternate routes for your journey and runs each one through an **8-factor safety scoring engine**. You see a **safety score (0–100)** alongside every route — so you can choose between arriving 3 minutes faster or arriving through a well-lit, lower-risk path.

Think of it as Google Maps + a local safety awareness layer, powered by community reports, government crime data, OpenStreetMap street lamps, live weather, and more.

**→ Try it now: [raahi-hazel.vercel.app](https://raahi-hazel.vercel.app/)**

---

## ✨ What Can You Do With Raahi?

**🗺️ Plan a Safe Route** — Enter a start and destination anywhere in India. Raahi fetches up to 3 driving alternatives and scores each one in parallel. Results show a safety score (color-coded green / amber / red), estimated time and distance, reason tags explaining deductions (*"Poorly Lit"*, *"Late Night"*, *"High Reports"*), and Safest vs Fastest badges so you can compare at a glance.

**📍 Report a Safety Hazard** — Logged-in users can drop a geo-tagged report directly from the map, including a safety rating (1–5), crowd level, street lighting status, theft indicator, and optional description. These reports feed back into the safety scores that other users see.

**🚨 Send an SOS** — A one-tap SOS button on the map sends your live GPS coordinates to your saved emergency contacts via SMS (Twilio). The button pulses red while sending and shows a green checkmark on success.

**📊 View Community Analytics** — The `/analytics` page shows trend charts from all community reports: daily report volume, average safety over time, crowd distribution, theft rates, and street lamp status breakdowns. Filterable by 7 / 30 / 90 day windows.

**🏥 See Nearby Safe Zones** — The map surfaces hospitals, police stations, and other safe zones near your route with green markers.

**🧑‍💻 Manage Your Reports** — The `/profile` dashboard lets you submit image-based reports with city/state tagging and browse your own submission history.

---

## 🧠 How We Calculate the Safety Score

This is the core of Raahi. Every route receives a score between **0 and 100**, computed by `safetyEngine.ts` (~650 lines). The engine runs **8 independent factors** — most in parallel — then combines them into a single weighted score.

### The Formula

```
Safety Score =
  Street Lighting   × 0.30  +
  Historical Crime  × 0.15  +
  Gov. Accidents    × 0.15  +
  Community Reports × 0.10  +
  Safe Zones        × 0.10  +
  Popular Places    × 0.10  +
  Time of Day       × 0.05  +
  Weather           × 0.05
```

Each factor produces a value from 0–100. The weighted sum is clamped to [0, 100].

---

### Factor 1 — 💡 Street Lighting `30% weight`

Street lighting is the single strongest predictor of perceived and actual safety on a route, so it carries the highest weight.

**How it works:**

1. The route geometry is buffered by **50 metres** using Turf.js to create a corridor polygon.
2. That polygon is sent to the **Overpass API** (OpenStreetMap) as a query for all `highway=street_lamp` nodes within it.
3. The lamp count is divided by route length in km → **lamps per km**.
4. Score: `min(100, lampsPerKm / 20 × 100)` — 20+ lamps/km = perfect score.
5. The final value blends 70% OSM-derived score + 30% satellite baseline of 60 (to account for lamps not yet mapped in OSM).
6. Results are cached per route for **5 minutes**.

> Short routes (< 12 coordinates) use a bounding box Overpass query instead of a polygon for speed.

**Deduction tag:** `poor_street_lighting`

---

### Factor 2 — 🔪 Historical Crime `15% weight`

Uses district-level NCRB (National Crime Records Bureau) data stored in a Supabase table.

**How it works:**

1. The route midpoint is reverse-geocoded via Mapbox to extract the **district name**.
2. The `crime_stats` table is queried for that district.
3. A composite crime index is built from: murder, rape, acid attack, kidnapping, stalking, and hit-and-run counts.
4. The index is normalized against district-level averages → produces a 0–100 factor (higher score = safer district).

---

### Factor 3 — ⚠️ Community Reports `10% weight`

Real-time user-submitted reports from within **150 metres** of the route.

**How it works:**

1. The route is downsampled to **30 evenly-spaced points** using `sampleCoords()`.
2. For each point, the PostGIS function `count_reports_nearby(lng, lat, 150)` runs. All 30 calls fire in parallel.
3. `reportFactor = max(0, 100 − totalReports × 10)` — so 10+ nearby reports drives this factor to 0; zero reports gives a full 100.

**Deduction tag:** `high_report_density`

---

### Factor 4 — 🚗 Government Accident Data `15% weight`

Uses the **NCRB 2022 traffic accident dataset** from `data.gov.in`, proxied server-side through `/api/accident` to avoid CORS issues.

**How it works:**

1. Route midpoint is reverse-geocoded to city + state.
2. A fuzzy matcher resolves against **50+ known Indian city aliases** and 35 states/UTs to find the right record.
3. City-level data is preferred; state-level is the fallback.
4. `riskScore = fatalityRate × 0.4 + injuryRate × 0.3 + accidentVolume × 0.3`
5. `factor = 100 − riskScore × 100`

Results are cached at ~11 km grid resolution with a 10-minute TTL.

---

### Factor 5 — 🏙️ Popular Places Score `10% weight`

A novel **geometry-only** algorithm — no external API call required. It estimates how urban and foot-trafficked a route is purely from its coordinate geometry.

**Three sub-signals:**

| Signal | Weight | What it detects |
|---|---|---|
| Cluster density | ×40 | Sliding window of 5 segments. If total length < 80m → "dense cluster" (market, intersection, urban node). `clusterRatio = denseWindows / totalWindows` |
| Micro-turn density | ×5 | Bearing changes between 5°–15° per km — proxy for sidewalks, crossings, urban infrastructure |
| Point density | ×1.5 | Coordinates per km — more points = more complex road = more urban |

A base score of +20 is added, clamped to [0, 100]. Urban routes score higher — more footfall means more witnesses and safer perception.

---

### Factor 6 — 🚔 Safe Zone Proximity `10% weight`

Measures how close the route passes to verified safe infrastructure like police stations, hospitals, fire stations, and transit hubs.

**How it works:**

1. Each of the 30 sampled route points is checked against the safe zone database within a **300m radius**.
2. Average nearby zones per point is computed.
3. `safeZoneFactor = min(100, 30 + avgNearby × 35)` — so 2+ nearby zones per point = 100; zero zones = 30 (baseline).
4. Additionally, each scored route **dynamically generates** new safe zones along its corridor (every 2–4 km), which accumulate in the database over time.

**Deduction tag:** `few_safe_zones_nearby`

> ⚠️ **Data source:** This factor currently uses a **local mock database** (`mockDB/db.ts`) containing ~80 hand-seeded real police station locations across 13 Indian cities, plus dynamically generated stations along scored routes. It does **not** query a live external API.

---

### Factor 7 — ⏰ Time of Day `5% weight`

Simple but impactful for anyone navigating at night.

- **11 pm – 5 am:** factor = **70** (penalty applied)
- **All other hours:** factor = **100**

**Deduction tag:** `late_night_travel`

---

### Factor 8 — 🌧️ Weather `5% weight`

Live conditions at the route midpoint from the **OpenWeather API**.

- Rain, drizzle, snow, thunderstorm, or fog → factor = **80**
- Clear or cloudy → factor = **100**
- Determined by OpenWeather condition code: any code below 700 = bad weather.

**Deduction tags:** `poor_weather_rain`, `poor_weather_thunderstorm`, `poor_weather_fog`

---

### Score Interpretation

| Score | Color | Meaning |
|---|---|---|
| 70 – 100 | 🟢 **Green — Safe** | Well-lit, low crime, few reports nearby |
| 45 – 69 | 🟡 **Amber — Moderate** | Some risk factors present; stay aware |
| 0 – 44 | 🔴 **Red — Caution** | Multiple risk signals; consider alternatives |

---

## 📡 Data Sources — What's Real vs What's Simulated

Transparency matters. Here's exactly where each data point comes from:

| Factor | Source | Type | Notes |
|---|---|---|---|
| **Street Lighting** | Overpass API (OpenStreetMap) | ✅ **Live API** | Queries real `highway=street_lamp` nodes in real-time |
| **Historical Crime** | Supabase `crime_stats` table | ⚠️ **Seeded data** | Real NCRB crime categories, manually seeded into the database |
| **Community Reports** | Supabase `user_reports` table | ✅ **Live user data** | Real user-submitted geo-tagged reports via PostGIS |
| **Gov. Accidents** | data.gov.in NCRB 2022 | ✅ **Live API** | Fetched in real-time via server proxy (`/api/accident`) |
| **Popular Places** | Route coordinate geometry | ✅ **Computed** | Pure math on route coordinates — no external data needed |
| **Safe Zones** | `mockDB/db.ts` | 🟡 **Mock / Simulated** | ~80 hand-seeded real police station locations + dynamically generated stations along routes |
| **Time of Day** | System clock | ✅ **Live** | `new Date()` — no external call |
| **Weather** | OpenWeather API | ✅ **Live API** | Real-time conditions at route midpoint |
| **Routing** | OSRM | ✅ **Live API** | Real driving routes with alternatives |
| **Geocoding** | Mapbox Geocoding v5 | ✅ **Live API** | Autocomplete + reverse geocoding |
| **SMS / SOS** | Twilio | ✅ **Live API** | Requires Twilio credentials in `.env.local` |

> **Summary:** 6 out of 8 safety factors use live, real-time data sources. Safe Zones uses a local mock database that grows over time as routes are scored. Historical Crime uses real NCRB categories seeded into Supabase.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State management | Zustand |
| Database & Auth | Supabase (PostgreSQL + PostGIS) |
| Map | Mapbox GL JS |
| Routing engine | OSRM (public endpoint) |
| Street lamp data | OpenStreetMap via Overpass API |
| Weather | OpenWeather API |
| Geocoding | Mapbox Geocoding v5 + Nominatim fallback |
| Accident data | data.gov.in (NCRB 2022) |
| SMS / SOS | Twilio |
| Mock safe zones | Local TypeScript DB (`mockDB/db.ts`) |
| Deployment | Vercel |
| Charts | Recharts |
| Geometry | Turf.js |

---

## 📁 Project Structure

```
/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── map/page.tsx              # Main app — search, score, navigate
│   ├── profile/page.tsx          # User dashboard
│   ├── admin/page.tsx            # Admin — all reports
│   ├── analytics/page.tsx        # Community charts
│   ├── (auth)/login              # Login
│   ├── (auth)/register           # Register
│   └── api/
│       ├── routes/score/         # Core: OSRM + safety scoring
│       ├── reports/              # Community reports CRUD + analytics
│       ├── accident/             # data.gov.in proxy
│       ├── dashboard/            # Image-based report CRUD
│       ├── safe-zones/           # PostGIS safe zone lookup
│       ├── journeys/             # Live journey tracking
│       └── sos/                  # Twilio SOS SMS
├── components/
│   ├── Map/MapCanvas.tsx         # Mapbox map (482 lines)
│   ├── Routing/                  # RoutePanel + RouteCard
│   ├── Modals/                   # ReportModal + LoginRequiredModal
│   ├── UI/                       # SOSButton, SafetyScoreBadge, ProfileMenu …
│   └── Home/                     # Navbar, Hero, FeatureCards
├── lib/
│   ├── safetyEngine.ts           # 🧠 The scoring engine (~650 lines)
│   ├── routing.ts                # OSRM helpers
│   ├── store.ts                  # Zustand state
│   └── supabase.ts               # Two Supabase clients
├── mockDB/
│   └── db.ts                     # 🟡 Mock safe zone database (grows at runtime)
├── hooks/useGeolocation.ts       # GPS watcher
└── types/index.ts                # Shared TypeScript interfaces
```

---

## 🚀 Run Locally

### Prerequisites

- Node.js v18+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Mapbox](https://mapbox.com) access token (free tier works)
- An [OpenWeather](https://openweathermap.org/api) API key (free tier, 1000 calls/day)
- Twilio account (optional — only needed for the SOS feature)

---

### Step 1 — Clone & install

```bash
git clone https://github.com/your-username/raahi.git
npm install
```

### Step 2 — Create `.env.local`

Inside `f/`, create `.env.local`:

```env
# Supabase — Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Mapbox — mapbox.com → Account → Access Tokens
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoixxxxxx...

# OpenWeather — openweathermap.org → My API Keys
OPENWEATHER_API_KEY=your_openweather_key

# Twilio (optional — only needed for SOS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

> Variables prefixed with `NEXT_PUBLIC_` are visible in the browser. Never put secret keys there. `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security and is only used in server-side API routes.

### Step 3 — Set up Supabase

In the **Supabase SQL Editor**, run this to create all tables, PostGIS functions, and storage:

```sql
create extension if not exists postgis;

create table user_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  position geography(Point, 4326) not null,
  safety_rating int check (safety_rating between 1 and 5),
  crowd int check (crowd between 1 and 5),
  theft boolean default false,
  street_lamp_status boolean default true,
  description text,
  created_at timestamptz default now()
);

create table dashboard_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  user_email text, city text, state text,
  description text, image_url text,
  created_at timestamptz default now()
);

create table crime_stats (
  id uuid primary key default gen_random_uuid(),
  district text not null,
  murder int default 0, rape int default 0,
  acid_attack int default 0, kidnapping int default 0,
  stalking int default 0, hit_and_run int default 0
);

create table safe_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null, type text, hours text,
  point geography(Point, 4326) not null,
  lat float, lng float
);

create table journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  geometry jsonb, share_token text unique,
  started_at timestamptz default now(), ended_at timestamptz
);

create table journey_waypoints (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid references journeys(id),
  point geography(Point, 4326),
  lat float, lng float,
  recorded_at timestamptz default now()
);

create table users (
  id uuid primary key references auth.users,
  emergency_contacts text[] default '{}',
  created_at timestamptz default now()
);

-- PostGIS RPC functions
create or replace function count_reports_nearby(lng float, lat float, radius_m float)
returns int language sql as $$
  select count(*)::int from user_reports
  where ST_DWithin(position, ST_MakePoint(lng, lat)::geography, radius_m);
$$;

create or replace function get_nearby_user_reports(p_lng float, p_lat float, p_radius float)
returns setof user_reports language sql as $$
  select * from user_reports
  where ST_DWithin(position, ST_MakePoint(p_lng, p_lat)::geography, p_radius);
$$;

create or replace function get_nearby_safe_zones(p_lng float, p_lat float, p_radius float)
returns setof safe_zones language sql as $$
  select * from safe_zones
  where ST_DWithin(point, ST_MakePoint(p_lng, p_lat)::geography, p_radius);
$$;
```

Then go to **Supabase → Storage** and create a **public bucket** named `report-images`.

### Step 4 — Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — Raahi is running locally.

---

## ☁️ Live on Vercel

The deployed version is live at **[https://raahi-hazel.vercel.app](https://raahi-hazel.vercel.app/)** — open it in your browser to use it right now, no setup needed.

If you want to deploy your own fork:

```bash
npm install -g vercel
vercel
```

Then open your Vercel project → **Settings → Environment Variables** → add all keys from `.env.local` → run `vercel --prod`.

---

## 🗺️ Pages

| URL | Description |
|---|---|
| `/` | Landing — hero, feature overview, CTA |
| `/map` | The main app — route search, safety scores, SOS, map reports |
| `/login` | Email + password login (Supabase) |
| `/register` | New account creation |
| `/profile` | Submit image reports, view your own history |
| `/admin` | All reports across the platform |
| `/analytics` | Charts: daily volume, safety trends, crowd, theft, lighting |

---

## 📊 By the Numbers

| | |
|---|---|
| Total source files | 45 |
| Lines of code | ~6,000 |
| Safety scoring factors | 8 |
| External APIs integrated | 9 |
| Supabase tables | 7 |
| API endpoints | 10 |
| Mock safe zone seeds | 80+ |

---

## 📄 License

MIT — do whatever you want, just keep it safe out there.

---

<div align="center">

Built to make every street safer, one route at a time. 🇮🇳

**[🌐 Open the live app →](https://raahi-hazel.vercel.app/)**

</div>
