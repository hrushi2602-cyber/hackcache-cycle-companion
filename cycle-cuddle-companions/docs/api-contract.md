# Menstrual Health Companion — API Contract

> **Status: every endpoint and schema below is PROPOSED — CONFIRM WITH BACKEND DEVELOPER.**
> The frontend was built against these shapes in mock mode. Nothing here assumes the FastAPI
> backend already implements them.

## Conventions (PROPOSED — CONFIRM WITH BACKEND DEVELOPER)

- Base URL: `VITE_API_BASE_URL` (default `http://192.168.1.16:8000`). No `/api` prefix, no version prefix.
- JSON in and out, `Content-Type: application/json` (voice upload uses `multipart/form-data`).
- Field names are **camelCase** (FastAPI: `alias_generator=to_camel`, `populate_by_name=True`).
- Dates are ISO `YYYY-MM-DD` strings; IDs are strings.
- No authentication. All data is for one user until auth is designed.
- Errors use FastAPI's default shape:
  - `{"detail": "Human readable message"}` for 4xx/5xx
  - `422` validation: `{"detail": [{"loc": ["body", "text"], "msg": "...", "type": "..."}]}`
  The frontend shows `detail` text directly to the user, and reads 422 `loc`/`msg` into field errors.

## Endpoints

| Feature | Method | Path | Service |
|---|---|---|---|
| Vent-to-Track | POST | `/vent` | `vent.service.ts` |
| Symptoms | GET | `/symptoms` | `symptoms.service.ts` |
| Symptoms | POST | `/symptoms` | `symptoms.service.ts` |
| Cycle | GET | `/cycle` | `cycle.service.ts` |
| Cycle | POST | `/cycle` | `cycle.service.ts` |
| Survival cards | GET | `/survival-cards` | `survival.service.ts` |
| Community | GET | `/community/posts` | `community.service.ts` |
| Community | POST | `/community/posts` | `community.service.ts` |
| Community | POST | `/community/posts/{id}/solidarity` | `community.service.ts` |
| Reports | — (built from `GET /symptoms`) | — | `reports.service.ts` |
| Reports PDF | GET | `/reports/symptoms.pdf` (not wired) | `reports.service.ts` |
| Capsule notes | GET | `/capsule` | `capsule.service.ts` |
| Capsule notes | POST | `/capsule` | `capsule.service.ts` |
| Voice notes | GET | `/capsule/voice-notes` | `voice-notes.service.ts` |
| Voice notes | POST | `/capsule/voice-notes` | `voice-notes.service.ts` |

All rows: **PROPOSED — CONFIRM WITH BACKEND DEVELOPER.**

### POST /vent — PROPOSED
Request: `{"text": "so tired and crampy today"}` — text 3–1000 chars after trim.
Response 200:
```json
{"message": "That sounds like a lot to carry today...", "suggestedSymptoms": ["Fatigue", "Cramps"]}
```
`suggestedSymptoms` are suggestions only. The user confirms each one before anything is saved.
The backend must not return diagnoses.
422: `{"detail":[{"loc":["body","text"],"msg":"String should have at least 3 characters","type":"string_too_short"}]}`

### GET /symptoms — PROPOSED
Response 200 (newest first):
```json
[{"id": "s1", "date": "2026-10-20", "symptoms": ["Cramps", "Fatigue"], "note": "optional"}]
```

### POST /symptoms — PROPOSED
Request: `{"symptoms": ["Cramps"], "note": "optional text"}` — at least 1 symptom, each 1–40 chars.
Response 201: the created `SymptomEntry` (server sets `id` and `date`).

### GET /cycle — PROPOSED
Response 200: `{"lastPeriodStart": "2026-10-10", "cycleLength": 28, "periodLength": 5}` or `null` if none saved.
(Confirm `null` with 200 vs `404` — the frontend currently expects `200 null`.)

### POST /cycle — PROPOSED
Request/response: same shape as above. Rules: `lastPeriodStart` not in the future; `cycleLength` 15–60;
`periodLength` 1–14 and less than `cycleLength`. Estimated dates are calculated on the frontend, not the backend.

### GET /survival-cards — PROPOSED
```json
[{"id": "fatigue", "title": "Low energy", "icon": "battery", "summary": "...", "tips": ["..."]}]
```
`icon` is one of `battery | flame | cloud | brain`.

### GET /community/posts — PROPOSED
```json
[{"id": "p1", "author": "Quiet Fern", "body": "...", "postedAgo": "2h ago", "reactions": 12, "reacted": false, "isOwn": false}]
```
Confirm whether the backend sends `postedAgo` text or an ISO `createdAt` (the frontend currently displays `postedAgo` as given).

### POST /community/posts — PROPOSED
Request: `{"body": "..."}` — 5–500 chars. Response 201: the created post with a server-assigned anonymous `author`.

### POST /community/posts/{id}/solidarity — PROPOSED
Request: `{}`. Toggles the reaction. Response 200: the updated post. `404` if the post doesn't exist.

### GET /capsule, POST /capsule — PROPOSED
GET → `[{"id": "c1", "createdAt": "2026-10-01", "text": "..."}]`
POST request `{"text": "..."}` (3–1000 chars) → 201 created note.

### Voice notes — PROPOSED (UI not connected yet)
`POST /capsule/voice-notes` multipart field `file` (audio/webm or audio/mp4, size limit TBD) →
`{"id": "v1", "createdAt": "2026-10-24", "durationSeconds": 42, "url": "https://..."}`.
`GET /capsule/voice-notes` → list of the same shape.

### Reports PDF — PROPOSED (not wired)
`GET /reports/symptoms.pdf` → `application/pdf`. Until confirmed, the Reports page explains that PDF
download isn't available and suggests browser Print → Save as PDF.

## Integration dependencies
- Backend running at `VITE_API_BASE_URL` with CORS enabled for the frontend origin (below).
- camelCase JSON and the FastAPI error shape above.
- No auth: if auth is added later, the client will need a token header — not implemented here.
- Storage for audio files (voice notes) — not decided.

## Switching from mock mode to the real API
1. Copy `.env.example` to `.env`.
2. Set `VITE_API_BASE_URL` to the backend (e.g. `http://192.168.1.16:8000`) and `VITE_USE_MOCK_API=false`.
3. Restart the dev server (Vite reads env only at startup).
4. With mock off, failures show as errors on each page. The app **never** silently falls back to demo data.

## FastAPI CORS for local development
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",   # Vite dev server
        "http://127.0.0.1:8080",
        # add the Lovable preview/published URL if calling from there
    ],
    allow_credentials=False,       # no cookies/auth yet
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)
```
Note: a hosted preview (https) cannot call `http://localhost:8000` on your machine. That only works when the frontend also runs locally, or when the backend is reachable at a public https URL.
