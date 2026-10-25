# 🌸 Cycle Companion (Frontend & Mobile App)

Empathetic, Biometric-Calibrated Menstrual Health Application built with React, Vite, Tailwind CSS, TanStack Router, and Capacitor.

## ✨ Features
- **Interactive Home Screen Card Deck:** 2–3 daily check-in questions that alter database state, biometric markers, and phase recommendations.
- **Native Android Home Screen Widget (`CycleWidgetProvider`):** Direct home screen launcher widget allowing users to answer check-in cards, view diet/emotion tips, and enjoy comforting quotes with a cartoon mascot.
- **Glassmorphism UI:** Calming, aesthetic interface with smooth micro-animations and intuitive navigation.
- **Capacitor Mobile Support:** Configured for Android and iOS devices.

## 🚀 Getting Started

### 1. Installation
```bash
bun install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```
Ensure `VITE_API_URL` points to your running FastAPI backend (e.g. `http://localhost:8000` or local network IP).

### 3. Development Server
```bash
bun run dev
```

### 4. Build Android APK
```bash
# Sync web bundle with Capacitor
bun run build
npx cap sync android

# Build Android APK
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home
cd android && ./gradlew assembleDebug
```
The debug APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.
