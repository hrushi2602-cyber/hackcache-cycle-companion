# Cycle Companions — FastAPI Backend

FastAPI backend server designed for the **Cycle Companions** mobile and web application.

## Prerequisites
- Python 3.10+ (Python 3.14 detected on your Mac)

## Setup & Running

1. **Create and activate a virtual environment** (recommended):
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the server**:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   > **Note:** Binding to `0.0.0.0` allows physical mobile devices on your Wi-Fi (`http://192.168.1.16:8000`) and Android emulators (`http://10.0.2.2:8000`) to connect seamlessly.

4. **API Interactive Docs**:
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

## Connecting Frontend / Mobile App
In `cycle-cuddle-companions/.env`:
```env
VITE_API_BASE_URL=http://192.168.1.16:8000
VITE_USE_MOCK_API=false
```
Then restart the frontend or rebuild the Capacitor app.
