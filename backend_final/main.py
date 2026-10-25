"""
FastAPI Central API Gateway for HackCache Phase-Aware Menstrual Health Application
==================================================================================
Integrates:
- widget_router (State transience, time decay, home screen UI widget)
- voice_listener_engine (Subtle voice vents, symptom heuristics, AI companion reassurance)
- recommendation_engine (Actionable phase-tailored advice via Groq LLMs)
- hostel_meal_engine & question_suggestion_engine (Nutrition & interactive cards)
- cycle_state_contract (Bayesian & EWMA cycle estimation, longitudinal telemetry)

Includes CORS middleware, strict Pydantic response models, robust 503/404 fallbacks,
and mock MongoDB state variables for immediate Swagger UI testing.
"""

import os
import traceback
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
from enum import Enum
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Core Domain Modules
from widget_router import WidgetRouter, WidgetDecision
from voice_listener_engine import SubtleVoiceListener, ListenerResponse, ExtractedSymptoms
from recommendation_engine import SuggestionEngine, ActionableSuggestions
from cycle_state_contract import (
    PhaseEstimate,
    EmotionalState,
    EvidenceSource,
    UserPhysiologyProfile,
    CycleRecord,
    DailyObservation,
    CycleStateEstimator,
    SharedCycleStateContract,
    memory_collection
)
from hostel_meal_engine import HostelMealEngine, HostelAccess, MealSymptom, HOSTEL_FOOD_MATRIX
from journal_engine import JournalEngine, CycleReflection
from question_suggestion_engine import QuestionAndSuggestionEngine, InteractiveQuestionCard, UserCardSubmission

from datetime import date
from typing import List, Optional
from pydantic import BaseModel

class UserProfile(BaseModel):
    last_period_start: date
    average_cycle_length: int
    dietary_restrictions: List[str] = []

class SymptomLog(BaseModel):
    symptom_type: str 
    severity: int 
    notes: Optional[str] = None

# ==============================================================================
# FASTAPI APPLICATION & CORS CONFIGURATION
# ==============================================================================

app = FastAPI(
    title="HackCache Menstrual & Emotional Gateway API",
    description=(
        "Central API gateway for a phase-aware menstrual health companion. "
        "Evaluates cycle phases, transience decay, symptom spikes, push notifications, "
        "and conversational vents with strict Pydantic schemas and mock state integration."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure Allowed CORS Origins
raw_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
mandatory_origins = [
    "https://localhost",
    "http://localhost",
    "capacitor://localhost",
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:8080",
    "http://localhost:3000",
]

if raw_origins:
    if raw_origins == "*":
        allow_origins = ["*"]
        allow_credentials = False
    else:
        parsed = [o.strip() for o in raw_origins.split(",") if o.strip()]
        for m in mandatory_origins:
            if m not in parsed:
                parsed.append(m)
        allow_origins = parsed
        allow_credentials = True
else:
    allow_origins = mandatory_origins
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for cloud platform health monitors."""
    return {"status": "ok"}


# ==============================================================================
# MOCK MONGODB STATE VARIABLES & IN-MEMORY STORE
# ==============================================================================

class MockUserState(BaseModel):
    user_id: str
    last_period_start: date
    typical_bleed_days: int = 5
    cycle_history: List[int] = Field(default_factory=lambda: [28, 29, 28])
    current_emotion: EmotionalState = EmotionalState.EXHAUSTED_LOW
    cramps_vas: int = Field(default=7, ge=0, le=10)
    pain_relief_taken: Optional[bool] = True
    pain_relief_effective: Optional[bool] = False
    nausea_detected: bool = True
    somatic_luteal_markers: bool = True
    confounder_flagged: bool = False
    hours_since_last_log: float = 2.5
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    chat_memories: List[Dict[str, Any]] = Field(default_factory=list)


# Pre-seeded users for immediate testing in Swagger UI
today = date.today()

MOCK_USER_STORE: Dict[str, MockUserState] = {
    # Default test user: Late Luteal, Exhausted, Pain=7, Nausea=True, recent log 2.5 hrs ago
    "test_user": MockUserState(
        user_id="test_user",
        last_period_start=today - timedelta(days=24), # Day 25
        cycle_history=[28, 29, 28],
        current_emotion=EmotionalState.EXHAUSTED_LOW,
        cramps_vas=7,
        pain_relief_taken=True,
        pain_relief_effective=False,
        nausea_detected=True,
        somatic_luteal_markers=True,
        hours_since_last_log=2.5,
        chat_memories=[
            {"session_summary": "Felt completely overwhelmed with nausea and lower back cramping.", "health_flags": ["cramps", "nausea"]}
        ]
    ),
    # High energy Follicular user with long elapsed time (testing time decay > 18h)
    "follicular_user": MockUserState(
        user_id="follicular_user",
        last_period_start=today - timedelta(days=8), # Day 9
        cycle_history=[28, 28, 29],
        current_emotion=EmotionalState.CALM_REGULATED,
        cramps_vas=0,
        pain_relief_taken=False,
        pain_relief_effective=None,
        nausea_detected=False,
        somatic_luteal_markers=False,
        hours_since_last_log=22.0,
        chat_memories=[]
    ),
    # Pain spike user: Menstrual Day 2, VAS=9, urgent comfort required
    "pain_spike_user": MockUserState(
        user_id="pain_spike_user",
        last_period_start=today - timedelta(days=1), # Day 2
        cycle_history=[27, 28, 28],
        current_emotion=EmotionalState.ACUTE_SPIRAL,
        cramps_vas=9,
        pain_relief_taken=True,
        pain_relief_effective=False,
        nausea_detected=False,
        somatic_luteal_markers=True,
        hours_since_last_log=1.0,
        chat_memories=[]
    )
}

# Alias "default", "demo_user", and "test_girl_01" to "test_user"
MOCK_USER_STORE["default"] = MOCK_USER_STORE["test_user"]
MOCK_USER_STORE["demo_user"] = MOCK_USER_STORE["test_user"]
MOCK_USER_STORE["test_girl_01"] = MOCK_USER_STORE["test_user"]


def get_mock_state_or_404(user_id: str) -> MockUserState:
    """Retrieve user state from mock store or raise 404."""
    state = MOCK_USER_STORE.get(user_id)
    if not state:
        # Auto-initialize unknown user dynamically for developer convenience if requested
        if user_id.startswith("auto_") or user_id in ["me", "current", "user"]:
            new_state = MockUserState(
                user_id=user_id,
                last_period_start=today - timedelta(days=23),
                cycle_history=[28, 29, 28],
                current_emotion=EmotionalState.OVERTHINKING_ANXIOUS,
                cramps_vas=5,
                hours_since_last_log=3.0
            )
            MOCK_USER_STORE[user_id] = new_state
            return new_state
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{user_id}' not found. Please test with 'test_user', 'demo_user', 'follicular_user', or call /api/onboard."
        )
    return state


def build_physiology_profile_from_state(state: MockUserState) -> UserPhysiologyProfile:
    """Helper to convert mock state into UserPhysiologyProfile for domain estimators."""
    cycle_records = [CycleRecord(length_days=l) for l in state.cycle_history]
    recent_obs = [
        DailyObservation(
            obs_date=today,
            is_bleeding=(today - state.last_period_start).days < state.typical_bleed_days,
            cramps_vas=state.cramps_vas,
            pain_relief_effective=state.pain_relief_effective,
            self_reported_emotion=state.current_emotion,
            somatic_luteal_markers=state.somatic_luteal_markers,
            confounder_flagged=state.confounder_flagged
        )
    ]
    return UserPhysiologyProfile(
        user_id=state.user_id,
        last_period_start=state.last_period_start,
        typical_bleed_days=state.typical_bleed_days,
        cycle_history=cycle_records,
        recent_observations=recent_obs
    )


async def safe_store_mongo_summary(user_id: str, message: str, reply: str, flags: List[str]):
    """Safe MongoDB background write with fallback to in-memory history if DB is down."""
    doc = {
        "user_id": user_id,
        "session_summary": f"User: {message[:120]}...",
        "health_flags": flags,
        "timestamp": datetime.now(timezone.utc)
    }
    # Update mock state immediately
    if user_id in MOCK_USER_STORE:
        MOCK_USER_STORE[user_id].chat_memories.append(doc)
    
    # Attempt real MongoDB insert if available
    try:
        await memory_collection.insert_one(doc)
    except Exception as e:
        # Standalone mock fallback: MongoDB offline is handled without failing the request
        print(f"[Mongo SafeStore Note]: MongoDB offline ({e}). Saved summary into mock in-memory state.")


# ==============================================================================
# STRICT PYDANTIC RESPONSE MODELS
# ==============================================================================

# 1. Widget State Model
class WidgetStateResponse(BaseModel):
    user_id: str
    widget_type: str = Field(description="UI Widget display mode: 'COMFORT', 'QUESTION', or 'SUGGESTION'")
    display_text: str = Field(description="Headline prompt or reassurance line rendered on home screen")
    evaluated_phase: PhaseEstimate = Field(description="Biological phase estimate evaluating time transience")
    evaluated_emotion: EmotionalState = Field(description="Underlying emotional state considered")
    hours_since_last_log: float = Field(description="Elapsed hours determining whether decay reset was applied")
    is_time_decayed: bool = Field(description="True if >18 hours elapsed, converting assumptions into open check-ins")


# 2. Notification Dispatcher Models
class NotificationPriority(str, Enum):
    URGENT = "URGENT"
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"

class PushNotification(BaseModel):
    notification_id: str
    notification_type: str = Field(description="Category: pain_alert, medication_reminder, hydration_comfort, phase_forecast")
    trigger_timing: str = Field(description="'IMMEDIATE' for sudden flares, or scheduled slot (e.g. '14:30_AFTERNOON', '20:30_EVENING')")
    priority: NotificationPriority
    title: str
    body: str
    action_url: Optional[str] = "/api/chat"

class NotificationDispatchResponse(BaseModel):
    user_id: str
    evaluated_phase: PhaseEstimate
    cramps_vas: int
    immediate_alert_triggered: bool
    notifications: List[PushNotification]
    clinical_pacing_note: str


# 3. Meal Planner Models
class RecommendedDish(BaseModel):
    name: str
    description: str
    access_required: List[str]
    symptoms_addressed: List[str]
    is_nausea_friendly: bool

class MealPlanResponse(BaseModel):
    user_id: str
    current_phase: PhaseEstimate
    detected_symptoms: List[str]
    conflicting_symptoms_present: bool = Field(description="True if symptoms like nausea conflict with standard rich phase foods")
    dietary_adjustment_alert: Optional[str] = Field(description="Notice explaining dynamic substitution (e.g. bland food for nausea)")
    cozy_disclaimer: str
    recommended_meals: List[RecommendedDish]
    foods_to_avoid: List[str]


# 4. Continuous Voice Vent Models
class ChatVentRequest(BaseModel):
    message: str = Field(description="Conversational voice transcript or text vent from the user")
    tone: Optional[str] = Field(default="reassuring, gentle, and empathetic", description="Desired companion persona tone")

class ChatVentResponse(BaseModel):
    user_id: str
    reply: str
    detected_symptoms: Optional[ExtractedSymptoms] = None
    extracted_symptoms: Optional[Dict[str, Any]] = None
    updated_phase: Optional[PhaseEstimate] = None
    silent_state_updated: bool = True
    session_summary: Optional[str] = None
    timestamp: str = Field(description="ISO string timestamp")
    ui_action: str = Field(default="REFRESH_WIDGET", description="UI action trigger")


# 5. Cycle Overview Model
class CycleOverviewResponse(BaseModel):
    user_id: str
    current_phase: PhaseEstimate
    cycle_day: int
    estimated_next_bleed_date: date
    prediction_window_days: int
    phase_confidence: float
    confidence_percentage: int
    uncertainty_reason: str
    evidence_source: str
    typical_cycle_length: float


# 6. Master Dashboard Models
class DashboardCheckInCard(BaseModel):
    card_id: str
    category: str
    prompt: str
    options: List[str]

class MasterDashboardResponse(BaseModel):
    user_id: str
    current_phase: PhaseEstimate
    emotional_state: EmotionalState
    productivity_grace: str = Field(description="Permission to pace and rest tailored to cycle phase")
    sleep_protocol: str = Field(description="Sleep recommendations considering basal body temperature and fatigue")
    diet_tips: str = Field(description="Nutrition advice tailored to phase and physical symptoms")
    check_in_questions: List[str] = Field(description="Check-in question prompts tailored to phase")
    symptoms_summary: Optional[Dict[str, Any]] = None


# Supporting Request Schemas
class OnboardRequest(BaseModel):
    user_id: str
    last_period_start: date
    typical_bleed_days: int = 5
    past_cycle_lengths: List[int] = Field(default_factory=lambda: [28, 29, 28])
    initial_emotion: Optional[EmotionalState] = EmotionalState.CALM_REGULATED


# ==============================================================================
# ENDPOINT IMPLEMENTATIONS
# ==============================================================================

@app.get("/api/widget/{user_id}", response_model=WidgetStateResponse, tags=["Widget State"])
async def get_widget_state(
    user_id: str,
    override_hours: Optional[float] = Query(None, description="Optional override to test time decay (e.g. 20.0 for >18h question mode)")
):
    """
    Evaluate time decay transience and cycle phase using widget_router.
    Returns the exact UI payload (comfort line, check-in question, or actionable suggestion)
    for the home screen.
    """
    try:
        state = get_mock_state_or_404(user_id)
        profile = build_physiology_profile_from_state(state)
        contract = CycleStateEstimator.build_shared_contract(profile, today)
        phase = contract.cycle_state.best_phase_estimate

        hours = override_hours if override_hours is not None else state.hours_since_last_log
        symptoms = ExtractedSymptoms(
            detected_emotion=state.current_emotion,
            detected_cramps_vas=state.cramps_vas,
            pain_relief_mentioned=state.pain_relief_effective,
            somatic_luteal_detected=state.somatic_luteal_markers
        )

        decision: WidgetDecision = WidgetRouter.determine_ui_state(
            phase=phase,
            emotion=state.current_emotion,
            symptoms=symptoms,
            hours_since_last_log=hours
        )

        return WidgetStateResponse(
            user_id=user_id,
            widget_type=decision.widget_type,
            display_text=decision.display_text,
            evaluated_phase=phase,
            evaluated_emotion=state.current_emotion,
            hours_since_last_log=hours,
            is_time_decayed=(hours > 18.0)
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Widget evaluation failed: {str(e)}"
        )


@app.get("/api/notifications/{user_id}", response_model=NotificationDispatchResponse, tags=["Notification Dispatcher"])
async def dispatch_notifications(user_id: str):
    """
    Evaluate the user's current physical payload to determine what push notifications to send
    and exactly when to trigger them (e.g., immediate alerts for pain spikes or scheduled medication reminders).
    """
    try:
        state = get_mock_state_or_404(user_id)
        profile = build_physiology_profile_from_state(state)
        contract = CycleStateEstimator.build_shared_contract(profile, today)
        phase = contract.cycle_state.best_phase_estimate

        notifications: List[PushNotification] = []
        immediate_alert = False

        # 1. Pain Spike Evaluation (VAS >= 7)
        if state.cramps_vas >= 7:
            immediate_alert = True
            notifications.append(PushNotification(
                notification_id="notif_cramp_flare",
                notification_type="pain_spike_alert",
                trigger_timing="IMMEDIATE",
                priority=NotificationPriority.URGENT,
                title="🚨 Severe Cramp Flare Detected",
                body=(
                    f"Your pain score is high (VAS {state.cramps_vas}/10). "
                    "Drop non-urgent tasks, recline with your knees bent, and apply a heat pad now."
                ),
                action_url="/api/chat"
            ))

            # Scheduled follow-up for medication
            if state.pain_relief_taken and not state.pain_relief_effective:
                notifications.append(PushNotification(
                    notification_id="notif_med_followup",
                    notification_type="medication_reminder",
                    trigger_timing="45_MINS_AFTER_MED",
                    priority=NotificationPriority.HIGH,
                    title="Medication Check-In",
                    body="It's been 45 minutes since your pain relief. Tap to tell me if the cramps eased or if you need soothing tea.",
                    action_url="/api/widget"
                ))

        # 2. Conflicting Nausea / Digestive Sensitivity
        if state.nausea_detected:
            notifications.append(PushNotification(
                notification_id="notif_nausea_comfort",
                notification_type="hydration_comfort",
                trigger_timing="IMMEDIATE" if state.hours_since_last_log < 3 else "14:30_AFTERNOON",
                priority=NotificationPriority.HIGH,
                title="Settle That Nausea 🫖",
                body="Take tiny sips of warm ginger or ajwain water. Avoid gulping cold liquids right now.",
                action_url="/api/meals"
            ))

        # 3. Scheduled Phase-Specific Notifications
        if phase in [PhaseEstimate.LATE_LUTEAL, PhaseEstimate.MENSTRUAL]:
            notifications.append(PushNotification(
                notification_id="notif_evening_rest",
                notification_type="phase_forecast",
                trigger_timing="20:30_EVENING",
                priority=NotificationPriority.NORMAL,
                title="Luteal Wind-Down Reminder 🌙",
                body="Your calming progesterone is naturally lower tonight. Dim your screens and give yourself permission to sleep early.",
                action_url="/api/dashboard"
            ))
        elif phase == PhaseEstimate.FOLLICULAR:
            notifications.append(PushNotification(
                notification_id="notif_focus_window",
                notification_type="productivity_focus",
                trigger_timing="14:30_AFTERNOON",
                priority=NotificationPriority.NORMAL,
                title="High Focus Runway Active ⚡",
                body=f"Day {contract.cycle_state.cycle_day} Follicular surge: Estrogen is primed for deep focus. Great block for your hardest task!",
                action_url="/api/dashboard"
            ))

        return NotificationDispatchResponse(
            user_id=user_id,
            evaluated_phase=phase,
            cramps_vas=state.cramps_vas,
            immediate_alert_triggered=immediate_alert,
            notifications=notifications,
            clinical_pacing_note=(
                "Immediate alerts triggered for acute pain spikes; "
                "pacing notifications queued for circadian wind-down."
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Notification dispatch evaluation failed: {str(e)}"
        )


@app.get("/api/meals/{user_id}", response_model=MealPlanResponse, tags=["Meal Planner"])
async def get_meal_plan(user_id: str):
    """
    Return dynamic, phase-specific dietary recommendations that auto-adjust
    if the user recently logged conflicting symptoms like nausea.
    """
    try:
        state = get_mock_state_or_404(user_id)
        profile = build_physiology_profile_from_state(state)
        contract = CycleStateEstimator.build_shared_contract(profile, today)
        phase = contract.cycle_state.best_phase_estimate

        detected_symptoms: List[str] = []
        if state.cramps_vas > 4:
            detected_symptoms.append("cramps")
        if state.nausea_detected:
            detected_symptoms.append("nausea")
        if state.somatic_luteal_markers:
            detected_symptoms.append("bloating")

        # Check for conflicting symptoms like nausea that override heavy/spicy mess meals
        conflicting = state.nausea_detected
        adjustment_alert = None
        recommended_dishes: List[RecommendedDish] = []
        foods_to_avoid: List[str] = []

        if conflicting:
            adjustment_alert = (
                "⚠️ Auto-Adjusted for Active Nausea: Rich/heavy protein foods temporarily paused. "
                "Prioritizing gut-calming, easily digestible Indian comfort staples."
            )
            recommended_dishes = [
                RecommendedDish(
                    name="Warm Ajwain & Jeera Water (Kettle-Friendly)",
                    description="Boil half a teaspoon of ajwain or jeera in your electric kettle. Sips quickly calm gastric nausea and luteal gas.",
                    access_required=["kettle_induction"],
                    symptoms_addressed=["nausea", "bloating", "cramps"],
                    is_nausea_friendly=True
                ),
                RecommendedDish(
                    name="Plain Curd Rice or Salted Moong Dal Khichdi",
                    description="Gentle on an inflamed stomach lining. Provides easily absorbed carbohydrates without aggravating nausea.",
                    access_required=["mess_only", "tapri_canteen"],
                    symptoms_addressed=["nausea", "bloating"],
                    is_nausea_friendly=True
                ),
                RecommendedDish(
                    name="Dry Salted Crackers or Lightly Roasted Makhana",
                    description="Absorbs excess gastric acid and delivers gentle magnesium without oily heaviness.",
                    access_required=["tapri_canteen"],
                    symptoms_addressed=["nausea", "cramps"],
                    is_nausea_friendly=True
                )
            ]
            foods_to_avoid = [
                "Oily mess gravies & deep-fried snacks (pakoras/samosas)",
                "Black coffee & acidic carbonated sodas",
                "High-fat dairy or heavily spiced curries"
            ]
        else:
            # Standard phase recommendations using hostel meal engine
            symptom_target = MealSymptom.CRAMPS if state.cramps_vas >= 5 else MealSymptom.LUTEAL_HUNGER
            receipt = HostelMealEngine.get_meal_suggestions(
                current_phase=phase,
                symptom=symptom_target,
                available_access=[HostelAccess.MESS_ONLY, HostelAccess.TAPRI_CANTEEN, HostelAccess.KETTLE_INDUCTION]
            )
            for f in receipt.food_options:
                recommended_dishes.append(RecommendedDish(
                    name=f.name,
                    description=f.description,
                    access_required=[a.value for a in f.access_required],
                    symptoms_addressed=[s.value for s in f.fixes_symptoms],
                    is_nausea_friendly=True
                ))
            foods_to_avoid = ["Excessive refined sugar", "Very salty packaged chips that worsen water retention"]

        return MealPlanResponse(
            user_id=user_id,
            current_phase=phase,
            detected_symptoms=detected_symptoms,
            conflicting_symptoms_present=conflicting,
            dietary_adjustment_alert=adjustment_alert,
            cozy_disclaimer=(
                "Hostel mess food can be unpredictable. These suggestions adhere to ICMR-NIN nutritional "
                "guidelines to keep your gut and hormones balanced."
            ),
            recommended_meals=recommended_dishes,
            foods_to_avoid=foods_to_avoid
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Meal planner generation failed: {str(e)}"
        )


@app.post("/api/chat/{user_id}", response_model=ChatVentResponse, tags=["Continuous Voice Vent"])
async def continuous_voice_vent(
    user_id: str,
    request: ChatVentRequest,
    background_tasks: BackgroundTasks
):
    """
    Route conversational inputs to the voice listener engine to maintain an empathetic,
    continuous chat loop that makes the user feel heard while silently updating her MongoDB state variables.
    """
    try:
        state = get_mock_state_or_404(user_id)

        # 1. Heuristic symptom extraction
        extracted: ExtractedSymptoms = SubtleVoiceListener._heuristic_extractor(request.message)

        # 2. Silently update MongoDB state variables in our mock store
        if extracted.detected_emotion != EmotionalState.UNREPORTED:
            state.current_emotion = extracted.detected_emotion
        if extracted.detected_cramps_vas > 0:
            state.cramps_vas = extracted.detected_cramps_vas
        if extracted.pain_relief_mentioned is not None:
            state.pain_relief_taken = True
            state.pain_relief_effective = extracted.pain_relief_mentioned
        if extracted.somatic_luteal_detected:
            state.somatic_luteal_markers = True
        if extracted.confounder_detected:
            state.confounder_flagged = True
        if extracted.is_bleeding_detected:
            state.last_period_start = today

        # Check for nausea mentions in chat
        if any(w in request.message.lower() for w in ["nausea", "nauseous", "vomit", "throw up", "queasy", "upset stomach"]):
            state.nausea_detected = True

        state.hours_since_last_log = 0.1 # Fresh log reset
        state.last_updated = datetime.now(timezone.utc)

        # 3. Contextual memory retrieval
        past_memories = state.chat_memories[-5:] if state.chat_memories else []
        memory_context = "\n".join(
            [f"- {m.get('session_summary')} (Flags: {', '.join(m.get('health_flags', []))})"
             for m in past_memories]
        ) if past_memories else "No prior recorded distress."

        # 4. Generate AI companion response via Groq (llama-3.1-8b-instant / fallback)
        ai_reply = await SubtleVoiceListener.build_prompt_and_reply(
            tone=request.tone or "reassuring, gentle, and empathetic",
            memory_context=memory_context,
            message=request.message
        )

        profile = build_physiology_profile_from_state(state)
        contract = CycleStateEstimator.build_shared_contract(profile, today)

        # If API returns fallback string or fails, enhance with companion rule-based speech
        if "trouble connecting" in ai_reply.lower() or not ai_reply.strip():
            ai_reply = SubtleVoiceListener._generate_companion_speech(request.message, extracted, contract)

        # 5. Silently record memory asynchronously
        health_flags = []
        if state.cramps_vas >= 7:
            health_flags.append("cramp_spike")
        if state.nausea_detected:
            health_flags.append("nausea")
        if extracted.detected_emotion != EmotionalState.UNREPORTED:
            health_flags.append(extracted.detected_emotion.value)

        background_tasks.add_task(
            safe_store_mongo_summary,
            user_id,
            request.message,
            ai_reply,
            health_flags
        )

        # Record memory into state store
        state.chat_memories.append({
            "session_summary": f"User: {request.message[:120]} | Companion: {ai_reply[:120]}",
            "health_flags": health_flags,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

        return ChatVentResponse(
            user_id=user_id,
            reply=ai_reply,
            detected_symptoms=extracted,
            extracted_symptoms=extracted.model_dump(),
            updated_phase=contract.cycle_state.best_phase_estimate,
            silent_state_updated=True,
            session_summary=f"Processed vent; emotion={state.current_emotion.value}, vas={state.cramps_vas}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            ui_action="REFRESH_WIDGET"
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Continuous voice vent failed: {str(e)}"
        )


@app.get("/api/cycle/{user_id}", response_model=CycleOverviewResponse, tags=["Cycle Overview"])
async def get_cycle_overview(user_id: str):
    """
    Fetch and return the foundational cycle data (current phase, cycle day,
    and estimated next bleed date) to populate the home screen tracker.
    """
    try:
        state = get_mock_state_or_404(user_id)
        profile = build_physiology_profile_from_state(state)
        contract: SharedCycleStateContract = CycleStateEstimator.build_shared_contract(profile, today)
        cs = contract.cycle_state

        return CycleOverviewResponse(
            user_id=user_id,
            current_phase=cs.best_phase_estimate,
            cycle_day=cs.cycle_day,
            estimated_next_bleed_date=cs.predicted_next_period_center,
            prediction_window_days=cs.prediction_window_days,
            phase_confidence=cs.phase_confidence,
            confidence_percentage=int(round(cs.phase_confidence * 100)),
            uncertainty_reason=cs.uncertainty_reason,
            evidence_source=cs.evidence_source.value,
            typical_cycle_length=cs.bayesian_posterior_length
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Cycle estimation failed: {str(e)}"
        )


@app.post("/api/dashboard/{user_id}", response_model=MasterDashboardResponse, tags=["Master Dashboard"])
async def get_master_dashboard(user_id: str, body: Optional[Dict[str, Any]] = None):
    """
    Ping the recommendation engine to generate the comprehensive daily summary,
    returning structured JSON for productivity grace, sleep protocols, check-in questions,
    and dietary tips. Accepts an optional or empty JSON body.
    """
    try:
        state = get_mock_state_or_404(user_id)
        profile = build_physiology_profile_from_state(state)
        contract = CycleStateEstimator.build_shared_contract(profile, today)
        phase = contract.cycle_state.best_phase_estimate

        symptoms = ExtractedSymptoms(
            detected_emotion=state.current_emotion,
            detected_cramps_vas=state.cramps_vas,
            pain_relief_mentioned=state.pain_relief_effective,
            somatic_luteal_detected=state.somatic_luteal_markers
        )

        # Call Groq-powered recommendation engine with resilience
        try:
            suggestions: ActionableSuggestions = await SuggestionEngine.generate_dashboard_cards(
                phase=phase,
                emotion=state.current_emotion,
                symptoms=symptoms
            )
        except Exception as rec_err:
            print(f"[Dashboard Recommendation Note]: {rec_err}")
            suggestions = ActionableSuggestions(
                diet_tips="Stay well hydrated today and opt for gentle, nourishing, hormone-balancing comfort foods.",
                sleep_protocol="Cool down your sleep space and allow yourself an earlier wind-down routine tonight.",
                productivity_grace="Honor what your body asks of you today. Pacing and rest are essential biological rhythms."
            )

        # Fetch interactive check-in cards as string prompts
        question_cards: List[InteractiveQuestionCard] = QuestionAndSuggestionEngine.get_daily_question_cards(contract)
        formatted_questions = [q.prompt for q in question_cards]

        return MasterDashboardResponse(
            user_id=user_id,
            current_phase=phase,
            emotional_state=state.current_emotion,
            productivity_grace=suggestions.productivity_grace,
            sleep_protocol=suggestions.sleep_protocol,
            diet_tips=suggestions.diet_tips,
            check_in_questions=formatted_questions,
            symptoms_summary={
                "cramps_vas": state.cramps_vas,
                "nausea_active": state.nausea_detected,
                "pain_relief_taken": state.pain_relief_taken,
                "somatic_luteal_markers": state.somatic_luteal_markers
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Master dashboard generation failed: {str(e)}"
        )


# ==============================================================================
# SUPPORTING ONBOARDING & EXTENSION ENDPOINTS
# ==============================================================================

@app.post("/api/onboard", response_model=Dict[str, Any], tags=["Onboarding"])
def onboard_user(req: OnboardRequest):
    """Register or initialize a user profile for stateful cycle evaluation."""
    state = MockUserState(
        user_id=req.user_id,
        last_period_start=req.last_period_start,
        typical_bleed_days=req.typical_bleed_days,
        cycle_history=req.past_cycle_lengths or [28, 29, 28],
        current_emotion=req.initial_emotion or EmotionalState.CALM_REGULATED,
        cramps_vas=0,
        nausea_detected=False,
        hours_since_last_log=1.0
    )
    MOCK_USER_STORE[req.user_id] = state
    return {
        "status": "success",
        "message": f"User {req.user_id} onboarded successfully.",
        "profile": state
    }


@app.get("/api/journal/{user_id}/summary", response_model=CycleReflection, tags=["Journal Summary"])
async def get_journal_summary(user_id: str):
    """Generate cycle reflection journal from recent conversational vents."""
    state = get_mock_state_or_404(user_id)
    recent_vents = [
        m.get("session_summary", "") for m in state.chat_memories[-5:]
    ] if state.chat_memories else [
        "Felt so anxious and exhausted today, I hate feeling stuck.",
        "Woke up feeling amazing, finished my assignment early.",
        "Cramps are flaring up right now, just want to lay in bed."
    ]
    summary = await JournalEngine.generate_journal_summary(recent_vents)
    return summary


@app.get("/health", tags=["System"])
def health_check():
    """Health check endpoint confirming API gateway status."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "mock_users_available": list(MOCK_USER_STORE.keys())
    }

@app.post("/api/user/{user_id}/profile")
async def create_user_profile(user_id: str, profile: UserProfile):
    # Store or update user state in state store
    MOCK_USER_STORE[user_id] = MockUserState(
        user_id=user_id,
        last_period_start=profile.last_period_start,
        cycle_history=[profile.average_cycle_length, profile.average_cycle_length, profile.average_cycle_length],
        current_emotion=EmotionalState.CALM_REGULATED,
        cramps_vas=0,
        nausea_detected=False,
        hours_since_last_log=1.0
    )
    return {
        "status": "success", 
        "message": "Profile saved. Cycle tracking initialized."
    }

@app.post("/api/log/{user_id}/symptoms")
async def log_quick_symptom(user_id: str, symptom: SymptomLog):
    state = MOCK_USER_STORE.get(user_id)
    if not state:
        state = MockUserState(
            user_id=user_id,
            last_period_start=today - timedelta(days=24),
            cycle_history=[28, 29, 28],
            current_emotion=EmotionalState.EXHAUSTED_LOW,
            cramps_vas=0,
            hours_since_last_log=0.1
        )
        MOCK_USER_STORE[user_id] = state

    # If the frontend sends the period start icon, trigger cycle reset
    if symptom.symptom_type == "period_start":
        state.last_period_start = today
        state.cramps_vas = symptom.severity
    elif symptom.symptom_type == "cramps":
        state.cramps_vas = symptom.severity
    elif symptom.symptom_type == "nausea":
        state.nausea_detected = True
    elif symptom.symptom_type == "anxiety":
        state.current_emotion = EmotionalState.OVERTHINKING_ANXIOUS
    elif symptom.symptom_type == "exhaustion":
        state.current_emotion = EmotionalState.EXHAUSTED_LOW

    state.hours_since_last_log = 0.1
    state.last_updated = datetime.now(timezone.utc)
        
    return {
        "status": "success", 
        "message": f"Logged {symptom.symptom_type} at severity {symptom.severity}.",
        "ui_action": "REFRESH_WIDGET" 
    }


# ==============================================================================
# INTERACTIVE CARD DECK ENDPOINTS
# ==============================================================================

class DeckAnswerRequest(BaseModel):
    selected_option_ids: List[str]
    card_id: Optional[str] = None
    obs_date: Optional[date] = None

@app.get("/api/deck/{user_id}", tags=["Interactive Deck"])
async def get_interactive_deck(user_id: str):
    """
    Get 2-3 interactive daily check-in questions with options tailored to her phase
    and current biometric state.
    """
    try:
        state = get_mock_state_or_404(user_id)
        profile = build_physiology_profile_from_state(state)
        contract = CycleStateEstimator.build_shared_contract(profile, today)
        cs = contract.cycle_state

        cards: List[InteractiveQuestionCard] = QuestionAndSuggestionEngine.get_daily_question_cards(contract)
        return {
            "user_id": user_id,
            "evaluated_phase": cs.best_phase_estimate.value,
            "cycle_day": cs.cycle_day,
            "confidence_percentage": int(round(cs.phase_confidence * 100)),
            "cards": [c.model_dump() for c in cards]
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Interactive deck retrieval failed: {str(e)}"
        )

@app.post("/api/deck/{user_id}/answer", tags=["Interactive Deck"])
async def answer_deck_card(user_id: str, req: DeckAnswerRequest):
    """
    Submit interactive card option selections.
    Directly updates physiological state variables (emotions, cramps, fatigue, bleeding),
    recalibrates the core Bayesian cycle model, and returns phase-tailored suggestions.
    """
    try:
        state = get_mock_state_or_404(user_id)
        profile = build_physiology_profile_from_state(state)
        contract = CycleStateEstimator.build_shared_contract(profile, today)

        # Get cards and options for mapping
        active_cards = QuestionAndSuggestionEngine.get_daily_question_cards(contract)
        option_lookup = {opt.option_id: opt for card in active_cards for opt in card.options}

        for opt_id in req.selected_option_ids:
            opt = option_lookup.get(opt_id)
            if not opt:
                continue
            if opt.maps_to_emotion is not None:
                state.current_emotion = opt.maps_to_emotion
            if opt.maps_to_cramps_vas is not None:
                state.cramps_vas = opt.maps_to_cramps_vas
            if opt.maps_to_pain_relief_worked is not None:
                state.pain_relief_taken = True
                state.pain_relief_effective = opt.maps_to_pain_relief_worked
            if opt.maps_to_somatic_luteal is not None:
                state.somatic_luteal_markers = opt.maps_to_somatic_luteal
            if opt.maps_to_confounder is not None:
                state.confounder_flagged = opt.maps_to_confounder
            if opt.maps_to_is_bleeding:
                state.last_period_start = req.obs_date or today

        state.hours_since_last_log = 0.1
        state.last_updated = datetime.now(timezone.utc)

        # Run model suggestion engine
        submission = UserCardSubmission(
            obs_date=req.obs_date or today,
            selected_option_ids=req.selected_option_ids
        )
        updated_profile = build_physiology_profile_from_state(state)
        suggestion = QuestionAndSuggestionEngine.process_answers_and_suggest(updated_profile, submission)
        updated_contract = CycleStateEstimator.build_shared_contract(updated_profile, today)
        phase = updated_contract.cycle_state.best_phase_estimate

        # Generate phase and emotion specific dietary & emotional advice
        diet_tips = []
        emotion_tips = []
        if state.cramps_vas >= 6:
            diet_tips.append("Warm chamomile or ginger tea to relax uterine muscle contractions.")
            diet_tips.append("Avoid cold iced drinks or ultra-salty snacks that worsen pelvic tension.")
            emotion_tips.append("Acute discomfort is exhausting. Give yourself zero guilt for taking things slow today.")
        elif state.somatic_luteal_markers or phase == PhaseEstimate.LATE_LUTEAL:
            diet_tips.append("Magnesium-rich foods (dark chocolate, almonds, banana) to support serotonin levels.")
            diet_tips.append("Complex carbs (oats, roasted makhana) to balance metabolic calorie burn without sugar crashes.")
            emotion_tips.append("Hormones are fluctuating—postpone heavy conflict or self-judgment for a couple of days.")
        elif phase == PhaseEstimate.FOLLICULAR:
            diet_tips.append("High protein and colorful antioxidants to support cellular building and energy.")
            emotion_tips.append("Clear-headed and sharp: your cognitive runway is open for exciting projects!")
        else:
            diet_tips.append("Hydrate generously and prioritize fresh, wholesome meals.")
            emotion_tips.append("Honor your body's signals with gentle awareness.")

        return {
            "status": "success",
            "message": "Answers recorded. Core cycle model updated.",
            "ui_action": "REFRESH_WIDGET",
            "updated_phase": phase.value,
            "phase_title": suggestion.phase_title,
            "productivity_forecast": suggestion.productivity_forecast,
            "actionable_suggestions": suggestion.actionable_suggestions,
            "reassurance_receipt": suggestion.reassurance_receipt,
            "diet_suggestions": diet_tips,
            "emotion_suggestions": emotion_tips
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to process card answer: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)