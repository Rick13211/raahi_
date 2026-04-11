# Understanding the SafeStep AI `safetyEngine.ts`

The `lib/safetyEngine.ts` file acts as the primary brain of the Raahi platform. Its main purpose is to take raw mapping coordinates and output a reliable **Safety Score (0-100)** along with human-readable tags explaining exactly *why* that score was given.

Here is a detailed breakdown of how the engine works from top to bottom.

---

## 1. The Core Concept: Multi-Criteria Weighting
The engine does not rely on a single factor to deem a route "safe". It breaks safety down into five discrete pillars. Each pillar is evaluated out of 100 independently, and then multiplied by its importance weight:

| Pillar | Importance | How it works |
| :--- | :--- | :--- |
| **Street Lighting** | **45%** | Well-lit streets reduce hazard risks. |
| **Safe Zones** | **20%** | Proximity to "Eyes on the street" (Police stations, 24/7 hospitals). |
| **Hazard Reports** | **20%** | The absence of user-reported active threats. |
| **Time of Day** | **10%** | Inherent heuristic penalties for late-night travel. |
| **Weather** | **5%** | Penalties for heavy rain/fog causing low visibility. |

*(All of this is defined at the top of the file in the `WEIGHTS` constant block).*

---

## 2. Spatial Efficiency: The Coordinate Sampler
When OSRM generates a walking route, it returns a dense *polyline* (an array of hundreds of `[lat, lng]` points outlining exactly where to walk). 

If the backend ran 5 database queries for every single point, a simple 20-minute walk would trigger thousands of DB queries and instantly crash/throttle the system.

**The Solution:** `sampleCoords(coords, 5)`
The engine skips 4 out of every 5 coordinates, plucking out geospatial "nodes" at roughly even intervals. All subsequent spatial queries are *only* run on these sparse nodes, vastly improving server response times.

---

## 3. Breakdown of the 5 Data Fetchers

### A. Lighting Calculation `getLightingFactor()`
Instead of verifying every node, the engine draws a mathematical **Bounding Box (BBox)** around the entire route.
1. It sends the boundaries to the OpenStreetMap **Overpass API**.
2. It asks specifically for a count of all items tagged `highway=street_lamp` or `lit=yes`.
3. It estimates the total length of the route using the **Haversine Formula** (which measures curve distances across the Earth).
4. By dividing the lamps by the distance, it determines the `Lamps per Km`. The score peaks at 100 if there are roughly 20+ lamps per kilometer.

### B. Safe Zones & Hazeds `countNearbySafeZones()` & `countNearbyReports()`
For every sampled node, the engine fires queries to your **Supabase PostGIS database** running in parallel:
1. **Safe Zones Radius:** Looks for verified markers within a wide **300 meters**. Every zone found adds points.
2. **Hazards Radius:** Looks for user submitted SOS/Hazard reports in a tighter **150 meters**. Every report found heavily deducts points.
Both functions use `rpc()` (Remote Procedure Calls) to execute a specialized spatial function written directly in PostgreSQL using `ST_DWithin`.

### C. Environmental Checks `getWeatherCondition()` & `isNightTime()`
1. The engine plucks the exact middle coordinate of the route (`sampled[midIdx]`) and checks it against the OpenWeatherMap API. If the API returns Rain, Mist, Drizzle, or Fog, the weather score drops.
2. The `Date` object checks local time. If it falls between 23:00 (11 PM) and 05:00 (5 AM), a flat penalty is applied to the time bracket.

---

## 4. Graceful Degradation (Crash Prevention)
Because the `safetyEngine.ts` depends on 3 different live external sources (Supabase, Overpass, OpenWeatherMap), it features aggressive "Graceful Degradation".

* **If Supabase Database is unconfigured:** The engine imports `hasSupabaseKeys`. If false, `countNearbyReports` instantly returns `0` so the map still renders.
* **If OpenWeatherMap doesn't have an API key:** The API returns a static fallback object containing `{ id: 800, main: "Clear" }`.
* **If Overpass API times out:** A hard `AbortSignal` cuts the request off after 12 seconds, and it returns a neutral factor of `60` so the user doesn't wait forever.

---

## 5. The Output 
After the math completes, `scoreRoute()` clamps the final sum (ensuring it never goes above 100 or below 0) and returns two parameters to the UI:
1. `score` (e.g. `87`)
2. `reasonTags` (e.g., `["late_night_travel", "poor_weather_rain"]`). These tags allow the frontend to render transparent badges telling the user exactly why the route might not be perfect.

---

## 6. External APIs and Data Sources

To compute all five safety pillars, the engine communicates with several external APIs and databases.

| Service Name | Purpose | Integration Details | Need API Key? |
| :--- | :--- | :--- | :--- |
| **Nominatim (OpenStreetMap)** | **Geocoding** | Converts user text inputs (e.g., "Connaught Place") into Lat/Lng coordinates before hitting the safety engine. | ❌ No |
| **Project OSRM** | **Routing Geometry** | Takes parsed coordinates and returns walking polyline paths and durations using `router.project-osrm.org`. | ❌ No |
| **Overpass API** | **Street Lighting Extraction** | Queries `overpass-api.de` using Overpass QL to extract infrastructure data (lamps) from the OpenStreetMap dataset. | ❌ No |
| **OpenWeatherMap API** | **Live Environmental Hazards** | Checks the exact coordinate of the user against `api.openweathermap.org` to penalize the score for active storms or fog. | ✅ Yes (`OPENWEATHER_API_KEY`) |
| **Supabase (PostgreSQL)** | **Community Safety Data** | Native Node.js `@supabase/supabase-js` database. Uses `ST_DWithin` PostGIS spatial RPCs to find nearby Safe Zones and hazards. | ✅ Yes (`NEXT_PUBLIC_SUPABASE_URL`, etc.) |
