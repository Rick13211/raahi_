# 🗺️ Raahi

![Raahi Banner](https://img.shields.io/badge/Status-Active_Development-brightgreen) ![Tech Stack](https://img.shields.io/badge/Stack-Next.js_16_%7C_React_19_%7C_Tailwind_v4-blue)

Raahi  is an advanced, navigation and personal safety application. Unlike traditional routing apps that prioritize just distance and time, Raahi dynamically calculates the **safest** route by analyzing real-time environmental factors, historical crime data, adequate street lighting, weather conditions, and community crowdsourced hazard reports.

## ✨ Core Features

*   **🛡️ Dynamic Safety Routing Engine:** Generates a 0-100 safety score for paths by evaluating data points using a custom spatial engine.
*   **🚨 Live SOS Emergency Alerts:** One-tap emergency trigger that dispatches your real-time Map URL via SMS (Twilio) and Email (SendGrid) instantly to trusted contacts.
*   **📍 Crowdsourced Community Hazards:** Users can drop pins to report real-time hazards (suspicious activity, unlit areas, waterlogging), which are instantly piped into the safety engine using PostGIS.
*   **🏥 Safe Zone Detection:** Overlays and routes near verified safe havens (police stations, hospitals, 24/7 businesses).
*   **☁️ Environmental Awareness:** Penalizes routes passing through severe weather events locally sourced via OpenWeatherMap API.

---

## 🛠️ Tech Stack

### Frontend & Architecture
*   **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
*   **Library:** [React 19](https://react.dev/)
*   **Styling:** Vanilla CSS + [Tailwind CSS v4](https://tailwindcss.com/)
*   **State Management:** [Zustand](https://github.com/pmndrs/zustand)
*   **Data Validation:** [Zod](https://zod.dev/)

### Map & Geospatial
*   **Map Rendering:** [Mapbox GL JS](https://www.mapbox.com/)
*   **Geospatial Computation:** [Turf.js](https://turfjs.org/)

### Backend, Database & APIs
*   **Database:** [Supabase](https://supabase.com/) (PostgreSQL + PostGIS for spatial queries)
*   **Communication:** Twilio SDK (SMS) / SendGrid (Email)

---

## 🧠 Data Integration & APIs

Raahi’s core intelligence comes from a fusion of various live endpoints:

1.  **Geocoding & Routing**
    *   **Nominatim API (OpenStreetMap):** Converts human-readable address queries into map coordinates.
    *   **Project OSRM (Open Source Routing Machine):** Fetches the actual route geometry, duration, and distance.
2.  **Safety Scoring Sources**
    *   **Overpass API (OSM):** Runs complex spatial queries for street lighting (`highway=street_lamp`).
    *   **OpenWeatherMap API:** Checks real-time route-midpoint weather conditions.
    *   **Supabase PostGIS RPCs:** Executes `ST_DWithin` spatial calculations to count nearby hazard reports and verified safe zones on the fly.

---

## 🚀 Getting Started (Local Development)

### Prerequisites

Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v20+ recommended)
*   npm or yarn

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/raahi.git
cd raahi/frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables Configuration

Create a `.env.local` file in the `frontend/` directory based on the following template. You will need to obtain your own API keys for the respective services.

```env
# Map & Geospatial
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_public_token

# Supabase (Database & Auth)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Weather
OPENWEATHER_API_KEY=your_openweathermap_api_key

# Twilio (SMS SOS)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_outbound_number

# SendGrid (Email SOS)
SENDGRID_API_KEY=your_sendgrid_api_key
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📁 Project Structure (Frontend Space)

```text
frontend/
├── app/                  # Next.js App Router (Pages, Layouts, API endpoints)
│   ├── api/              # Internal Next.js APIs (/api/routes/score, /api/sos, etc.)
│   └── ... 
├── components/           # Reusable React components (UI, Map overlays, Modals)
├── hooks/                # Custom React hooks
├── lib/                  # Core utility functions & modules
│   ├── routing.ts        # OSRM and Nominatim handlers
│   └── safetyEngine.ts   # The brain: calculates the 0-100 safety score
├── public/               # Static assets
└── types/                # TypeScript interface definitions
```

## 📜 License

This project is licensed under the MIT License.
