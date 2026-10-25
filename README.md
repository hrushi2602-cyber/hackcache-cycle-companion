# 🌸 Cycle Companion (Cycle Cuddle)

> **Empathetic, Biometric-Calibrated Menstrual Health Ecosystem powered by Sub-Second LLM Inference and Native Android Home Screen Widgets.**

---

## ✨ Features & Capabilities

### 📱 1. Interactive Home Screen Card Deck (App & Native Android Widget)
- **Daily Check-In Deck:** 2–3 interactive question cards tailored to the current cycle phase (*Mind & Mood*, *Body & Comfort*, *Fuel & Cravings*).
- **Native Android Home Screen Widget (`CycleWidgetProvider`):** Direct interactive widget on the phone launcher. Tapping options directly updates the user's biometric state in the database and recalibrates the core hormonal cycle model.
- **Phase Insights & Suggestions:** Dynamically generates actionable nutrition, hydration, and emotional grounding guardrails.
- **Aesthetic Empty Deck Sanctuary:** Once check-in is complete, transforms into a comforting sanctuary displaying a cartoon cozy mascot graphic and rotating uplifting daily quotes.

### ⚡ 2. Sub-Second AI Engines (Groq / Mistral)
- **Fast Inference:** Ultra-low-latency completions via Groq (`llama-3.3-70b-versatile` & `llama-3.1-8b-instant`).
- **Voice Listener & Symptom Extractor:** Parses unstructured voice notes or text entries into clinical/somatic markers (VAS pain score, anxiety, energy levels).
- **Personalized Recommendations:** Generates phase-specific meal, sleep, and emotional pacing advice.

### 📱 3. Capacitor Cross-Platform Integration
- Native Android app with cleartext network communication to the FastAPI backend.
- Standalone build pipeline for generating debug and release APKs.

---

## 📂 Project Architecture

```
Hackcache_front/
├── backend_final/                     # FastAPI AI Backend Gateway
│   ├── main.py                        # Central FastAPI endpoints & deck routes
│   ├── question_suggestion_engine.py  # Interactive card deck question bank & state machine
│   ├── recommendation_engine.py       # Groq-powered phase & meal recommendations
│   ├── voice_listener_engine.py       # Empathetic symptom extraction & listener
│   ├── journal_engine.py              # Cycle reflection & memory logging
│   └── .env.example                   # Backend environment template
│
└── cycle-cuddle-companions/           # Frontend Web & Native Mobile App
    ├── src/
    │   ├── components/menstrual/      # HomeScreenCardDeck, CycleHeader, etc.
    │   ├── services/menstrualApi.ts   # Typed API client connected to FastAPI
    │   └── routes/                    # TanStack Router screens (Calendar, Capsule, etc.)
    ├── android/                       # Capacitor Android native project
    │   └── app/src/main/
    │       ├── java/.../CycleWidgetProvider.java # Native 4x3 Android Widget Provider
    │       └── res/layout/cycle_app_widget.xml   # RemoteViews layout for card deck
    ├── capacitor.config.ts            # Capacitor mobile configuration
    └── .env.example                   # Frontend environment template
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18+) or **Bun** (v1.0+)
- **Python** (v3.10+)
- **Android Studio / JDK 21** (for building Android APK and widget)

---

### 2. Backend Setup (`backend_final`)

1. Navigate to the backend directory:
   ```bash
   cd backend_final
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install fastapi uvicorn pydantic python-dotenv groq httpx mistralai
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Add your `GROQ_API_KEY` inside `.env`.

5. Start the FastAPI server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *FastAPI interactive docs will be available at [http://localhost:8000/docs](http://localhost:8000/docs).*

---

### 3. Frontend & Mobile Setup (`cycle-cuddle-companions`)

1. Navigate to the frontend directory:
   ```bash
   cd ../cycle-cuddle-companions
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Set `VITE_API_URL=http://localhost:8000` (or your local LAN IP for physical device testing).

4. Run Vite development server:
   ```bash
   bun run dev
   ```

---

### 4. Android Native Widget & APK Build

To compile the Android mobile application with the native home screen widget:

```bash
cd cycle-cuddle-companions

# Build web assets and sync to Android
bun run build
npx cap sync android

# Build debug APK using Java 21
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home
cd android && ./gradlew assembleDebug
```

The output APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔒 Security & Environment Variables

- `.env` files contain sensitive API credentials and are strictly excluded via `.gitignore`.
- Always use `.env.example` templates when cloning and deploying.

---

## 📄 License
MIT License. Built with care for menstrual health & emotional well-being.
