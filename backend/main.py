from datetime import date, datetime
import uuid
from typing import List, Optional
from fastapi import FastAPI, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel

app = FastAPI(
    title="Cycle Companions API",
    description="FastAPI backend for Menstrual Health Companion mobile & web app",
    version="1.0.0"
)

# Enable CORS for Web and Mobile (Capacitor iOS & Android)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://192.168.1.16:8080",
        "capacitor://localhost",
        "http://localhost",
        "https://localhost",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base model with camelCase serialization for seamless frontend integration
class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

# --- Schemas ---
class VentRequest(CamelModel):
    text: str = Field(..., min_length=3, max_length=1000)

class VentResponse(CamelModel):
    message: str
    suggested_symptoms: List[str]

class SymptomCreate(CamelModel):
    symptoms: List[str] = Field(..., min_length=1)
    note: Optional[str] = None

class SymptomEntry(CamelModel):
    id: str
    date: str
    symptoms: List[str]
    note: Optional[str] = None

class CycleData(CamelModel):
    last_period_start: str
    cycle_length: int = Field(..., ge=15, le=60)
    period_length: int = Field(..., ge=1, le=14)

class SurvivalCard(CamelModel):
    id: str
    title: str
    icon: str
    summary: str
    tips: List[str]

class CommunityPostCreate(CamelModel):
    body: str = Field(..., min_length=5, max_length=500)

class CommunityPost(CamelModel):
    id: str
    author: str
    body: str
    posted_ago: str
    reactions: int
    reacted: bool
    is_own: bool

class CapsuleNoteCreate(CamelModel):
    text: str = Field(..., min_length=3, max_length=1000)

class CapsuleNote(CamelModel):
    id: str
    created_at: str
    text: str

class VoiceNote(CamelModel):
    id: str
    created_at: str
    duration_seconds: int
    url: str

# --- In-Memory Database (Sample State) ---
db_symptoms: List[SymptomEntry] = [
    SymptomEntry(id="s1", date="2026-10-20", symptoms=["Cramps", "Fatigue"], note="Used heating pad and took a nap"),
    SymptomEntry(id="s2", date="2026-10-19", symptoms=["Bloating", "Headache"], note="Drank extra peppermint tea"),
]

db_cycle: Optional[CycleData] = CycleData(
    last_period_start="2026-10-10",
    cycle_length=28,
    period_length=5
)

db_survival_cards: List[SurvivalCard] = [
    SurvivalCard(
        id="fatigue",
        title="Zero-energy day",
        icon="battery",
        summary="When getting out of bed feels like climbing Everest.",
        tips=[
            "Switch to horizontal mode with zero guilt.",
            "Hydration count: sips from a bedside bottle.",
            "Delegate whatever can wait until tomorrow."
        ]
    ),
    SurvivalCard(
        id="cramps",
        title="Pain flare-up",
        icon="flame",
        summary="Cramps are loud and demanding comfort.",
        tips=[
            "Direct heat: hot water bottle or electric pad on lower abdomen.",
            "Gentle child's pose with a bolster or pillows.",
            "Warm tea with ginger or chamomile."
        ]
    ),
    SurvivalCard(
        id="mood",
        title="Heavy feelings",
        icon="cloud",
        summary="Hormonal shifts can make emotions feel overwhelming.",
        tips=[
            "Remind yourself: this is biology speaking, not your whole truth.",
            "Wrap yourself in your coziest blanket cocoon.",
            "Write it all out in Vent-to-Track and let it go."
        ]
    ),
    SurvivalCard(
        id="brain-fog",
        title="Brain fog",
        icon="brain",
        summary="Thoughts feeling slow, scattered, or dreamy.",
        tips=[
            "Write down the single most important task; ignore the rest.",
            "Step outside for 2 minutes of cool fresh air.",
            "Avoid multitasking; one gentle step at a time."
        ]
    )
]

db_community_posts: List[CommunityPost] = [
    CommunityPost(
        id="p1",
        author="Quiet Fern",
        body="Day 1 hit hard today. Grateful for heated blankets and peppermint tea. Sending warmth to everyone riding this wave right now.",
        posted_ago="2h ago",
        reactions=14,
        reacted=False,
        is_own=False
    ),
    CommunityPost(
        id="p2",
        author="Gentle Willow",
        body="Reminder that taking a nap in the afternoon during your luteal phase isn't lazy, it's essential body maintenance.",
        posted_ago="4h ago",
        reactions=28,
        reacted=True,
        is_own=False
    ),
    CommunityPost(
        id="p3",
        author="Soft Moss",
        body="Cooked a big pot of comforting ginger broth today. Fed my future self for the next two days of low spoons.",
        posted_ago="6h ago",
        reactions=9,
        reacted=False,
        is_own=False
    )
]

db_capsule_notes: List[CapsuleNote] = [
    CapsuleNote(id="c1", created_at="2026-10-01", text="Remember: this phase passes every month. You are resilient, gentle, and doing enough."),
    CapsuleNote(id="c2", created_at="2026-10-15", text="Drink warm broth, put your phone on do not disturb, and watch your comfort show.")
]

db_voice_notes: List[VoiceNote] = []

# --- API Endpoints ---

@app.get("/")
def root():
    return {"status": "ok", "message": "Cycle Companions FastAPI is running smoothly!"}

# 1. Vent-to-Track
@app.post("/vent", response_model=VentResponse)
def vent(req: VentRequest):
    text_lower = req.text.lower()
    symptoms = []
    if any(w in text_lower for w in ["cramp", "pain", "hurt", "ache", "sore"]):
        symptoms.append("Cramps")
    if any(w in text_lower for w in ["tire", "exhaust", "sleepy", "fatigue", "drained"]):
        symptoms.append("Fatigue")
    if any(w in text_lower for w in ["bloat", "heavy", "full"]):
        symptoms.append("Bloating")
    if any(w in text_lower for w in ["headache", "migraine", "head"]):
        symptoms.append("Headache")
    if any(w in text_lower for w in ["sad", "cry", "mood", "angry", "irritat", "anxious"]):
        symptoms.append("Mood swings")
    if not symptoms:
        symptoms = ["Fatigue", "Rest needed"]

    return VentResponse(
        message="Thank you for sharing. That sounds like a lot to carry today. Take it gently with yourself.",
        suggested_symptoms=symptoms
    )

# 2. Symptoms
@app.get("/symptoms", response_model=List[SymptomEntry])
def get_symptoms():
    return db_symptoms

@app.post("/symptoms", response_model=SymptomEntry, status_code=status.HTTP_201_CREATED)
def create_symptom(req: SymptomCreate):
    entry = SymptomEntry(
        id=f"s_{uuid.uuid4().hex[:6]}",
        date=date.today().isoformat(),
        symptoms=req.symptoms,
        note=req.note
    )
    db_symptoms.insert(0, entry)
    return entry

# 3. Cycle
@app.get("/cycle", response_model=Optional[CycleData])
def get_cycle():
    return db_cycle

@app.post("/cycle", response_model=CycleData)
def save_cycle(data: CycleData):
    global db_cycle
    db_cycle = data
    return db_cycle

# 4. Survival Cards
@app.get("/survival-cards", response_model=List[SurvivalCard])
def get_survival_cards():
    return db_survival_cards

# 5. Community
@app.get("/community/posts", response_model=List[CommunityPost])
def get_community_posts():
    return db_community_posts

@app.post("/community/posts", response_model=CommunityPost, status_code=status.HTTP_201_CREATED)
def create_community_post(req: CommunityPostCreate):
    post = CommunityPost(
        id=f"p_{uuid.uuid4().hex[:6]}",
        author="Kind Traveler",
        body=req.body,
        posted_ago="Just now",
        reactions=0,
        reacted=False,
        is_own=True
    )
    db_community_posts.insert(0, post)
    return post

@app.post("/community/posts/{post_id}/solidarity", response_model=CommunityPost)
def toggle_solidarity(post_id: str):
    for post in db_community_posts:
        if post.id == post_id:
            if post.reacted:
                post.reactions = max(0, post.reactions - 1)
                post.reacted = False
            else:
                post.reactions += 1
                post.reacted = True
            return post
    raise HTTPException(status_code=404, detail="Post not found")

# 6. Capsule Notes
@app.get("/capsule", response_model=List[CapsuleNote])
def get_capsule_notes():
    return db_capsule_notes

@app.post("/capsule", response_model=CapsuleNote, status_code=status.HTTP_201_CREATED)
def create_capsule_note(req: CapsuleNoteCreate):
    note = CapsuleNote(
        id=f"c_{uuid.uuid4().hex[:6]}",
        created_at=date.today().isoformat(),
        text=req.text
    )
    db_capsule_notes.insert(0, note)
    return note

# 7. Voice Notes
@app.get("/capsule/voice-notes", response_model=List[VoiceNote])
def get_voice_notes():
    return db_voice_notes

@app.post("/capsule/voice-notes", response_model=VoiceNote, status_code=status.HTTP_201_CREATED)
async def upload_voice_note(file: UploadFile = File(...)):
    note = VoiceNote(
        id=f"v_{uuid.uuid4().hex[:6]}",
        created_at=date.today().isoformat(),
        duration_seconds=30,
        url=f"/media/{file.filename}"
    )
    db_voice_notes.insert(0, note)
    return note
