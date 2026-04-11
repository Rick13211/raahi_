# Raahi (SafeStep AI) - Project Theory & Core Functions

## 1. Project Overview & Theory
Traditional navigation apps (like Google Maps) are optimized solely for **efficiency** (fastest route or shortest distance). They route pedestrians through dark alleys, high-crime areas, or poorly lit streets simply because it saves time.

**Raahi (SafeStep AI)** operates on a different theoretical model: **Safety-First Navigation**. 
Rather than returning a single deterministic fastest route, the system generates multiple alternate routes and evaluates an algorithmic safety score for every mathematical segment of those paths. The final decision balances acceptable distance trade-offs with maximal personal security.

---

## 2. Core Algorithmic Theory: The Weighted Multi-Criteria Safety Model
The safety of a given route is not derived from a single data point. It is modelled as a **Multi-Criteria Decision Analysis (MCDA)**. We use a normalized 0-100 scoring system driven by five weighted pillars:

```text
Safety Score (S) = (W_lit × L) + (W_zon × Z) + (W_rep × R) + (W_wea × We) + (W_tim × T)
```
Where each variable evaluates to a 0–100 sub-score, weighted by importance:
1.  **L (Lighting) - 45% weight**: Evaluates structural visibility (streetlamps) via Overpass API density. High visibility deters crime.
2.  **Z (Safe Zones) - 20% weight**: Evaluates presence of active guardians (police stations, hospitals). Driven by PostGIS spatial queries.
3.  **R (Report Density) - 20% weight**: Crowd-sourced hazard deduction. High incident density mathematically lowers the score.
4.  **T (Time of Day) - 10% weight**: Static temporal risk matrix. Night hours automatically incur heuristic penalties.
5.  **We (Weather) - 5% weight**: Environmental constraints (heavy fog, rain). Reduces visibility and implies lack of "eyes on the street" (pedestrian traffic).

---

## 3. Breakdown of Main Functions

### `scoreRoute(input: ScoreInput)` *(in `lib/safetyEngine.ts`)*
**Theoretical Purpose:** This is the mathematical heart of the platform. It executes the multi-criteria safety evaluation.
**How it Operates:**
1.  **Sampling Algorithm:** Given a polyline of maybe 400 coordinate pairs, querying a spatial database for *each point* is an O(N) operation that would cause DB throttling. The engine invokes `sampleCoords(coords, 5)`, which skips nodes efficiently, creating mathematical waypoints along the polyline.
2.  **Parallel Execution:** Uses `Promise.all()` to fire simultaneous PostGIS database queries testing the radii around the waypoints for reports and safe zones.
3.  **Linear Normalization:** Normalizes variables (e.g. `reportFactor = Math.max(0, 100 - totalReports * 10)`) to lock them securely into a 0-100 mathematical bracket.
4.  **Reason tagging:** As the score drops, the engine intelligently appends human-readable tags (e.g. `"poor_street_lighting"`) so the UI can explain the deduction transparently.

### `getLightingFactor(coords)` *(in `lib/safetyEngine.ts`)*
**Theoretical Purpose:** Calculates the objective brightness of physical streets without relying on proprietary databases.
**How it Operates:**
1.  Instead of attempting to geocode lines, the function constructs a geometric **Bounding Box (BBox)** `(minLat, minLng, maxLat, maxLng)` heavily padded around the route.
2.  It translates this BBox into the **Overpass Query Language (Overpass QL)** to ask OpenStreetMap natively for nodes tagged `highway=street_lamp`.
3.  It derives route length via the **Haversine Formula** (which calculates the great-circle distance between two points on a sphere, modeling the curvature of the Earth).
4.  Divides lamp count by distance to calculate `Lamps/Km Density`.

### `countNearbyReports()` & `countNearbySafeZones()` *(in `lib/safetyEngine.ts`)*
**Theoretical Purpose:** Determines real-world spatial relation using Postgres + PostGIS.
**How it Operates:**
1.  The Postgres database contains PostGIS `geometry(Point, 4326)` columns. Simple mathematical geometry (Pythagorean distance) fails over long geographic distances.
2.  It calls a Postgres Remote Procedure Call (RPC) utilizing the `ST_DWithin` PostGIS function.
3.  `ST_DWithin(Geography(geom1), Geography(geom2), radius_in_meters)` relies on complex spheroid mathematics to accurately determine if a hazard physically falls within a rigid 150m radius of the user's trajectory.

### `fetchRouteData()`  *(in `lib/routing.ts`)*
**Theoretical Purpose:** Handles the sequence from user-text mapping to polyline generation.
**How it Operates:**
1.  **Geocoding:** Sends text ("Connaught Place") to Nominatim to convert human linguistic input into machine-readable `(Lat, Lng)` coordinates.
2.  **Edge Networking:** Proxies a request locally to `POST /api/routes/score`.
3.  **OSRM Pipeline:** The backend consumes Open Source Routing Machine APIs, projecting shortest-path variants over a spatial graph of India's road network, finally folding it into the `.scoreRoute` process mentioned above.

---

## 4. Key Takeaways
Your project acts as an infrastructural bridge. It combines standard shortest-path networking constructs (Dijkstra’s algorithm within OSRM) with spatial analytical overlays (PostGIS `ST_DWithin`) and live OpenStreetMap data (Overpass QL) to mathematically optimize routes for survival and security rather than pure speed.
