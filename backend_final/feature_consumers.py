import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel
from cycle_state_contract import (
    SharedCycleStateContract,
    PhaseEstimate,
    EmotionalState,
    EvidenceSource,
    memory_collection
)

# ==========================================
# BACKGROUND TASK: MEMORY SUMMARY STORAGE
# ==========================================

async def extract_and_store_summary(user_id: str, user_message: str, ai_reply: str):
    """
    Background task to parse health flags from the conversation 
    and store the interaction asynchronously into MongoDB.
    """
    health_flags = ["consult doctor"] if "pain" in user_message.lower() else []
    
    extracted_data = {
        "user_id": user_id,
        "session_summary": f"User mentioned: {user_message}",
        "health_flags": health_flags,
        "timestamp": datetime.datetime.now(datetime.UTC)
    }
    
    await memory_collection.insert_one(extracted_data)

# ==========================================
# OUTPUT SCHEMAS FOR THE 4 USER MODULES
# ==========================================

class WidgetViewPayload(BaseModel):
    companion_visual_state: str
    headline_prompt: str
    quick_tap_emotions: List[Dict[str, str]]
    show_sos_comfort_mode: bool

class CardItem(BaseModel):
    card_id: str
    target_metric: str
    question_text: str
    options: List[str]

class VoiceCompanionPromptConfig(BaseModel):
    system_instruction: str
    opening_reassurance_line: str
    ephemeral_mode_active: bool

class DailyUserExperienceBundle(BaseModel):
    widget: WidgetViewPayload
    card_deck: List[CardItem]
    morning_notification: str
    voice_companion: VoiceCompanionPromptConfig
    gentle_doctor_dossier_nudge: Optional[str] = None


# ==========================================
# THE 4 DECODERS (CONSUMING SHARED CONTRACT)
# ==========================================

class FeatureConsumerHub:

    @staticmethod
    def build_widget(contract: SharedCycleStateContract) -> WidgetViewPayload:
        emotion = contract.emotional_routing.primary_driver
        phase = contract.cycle_state.best_phase_estimate

        if emotion in [EmotionalState.ACUTE_SPIRAL, EmotionalState.OVERTHINKING_ANXIOUS, EmotionalState.IRRITABLE_FRUSTRATED]:
            return WidgetViewPayload(
                companion_visual_state="companion_holding_tea_and_blanket_rainy",
                headline_prompt="I've got you. Take it one hour at a time today.",
                quick_tap_emotions=[
                    {"label": "Talk to me (Voice)", "maps_to": emotion.value},
                    {"label": "Feeling a bit better", "maps_to": EmotionalState.CALM_REGULATED.value}
                ],
                show_sos_comfort_mode=True
            )

        ambient_visual = "companion_sunny_desk"
        if phase in [PhaseEstimate.MENSTRUAL, PhaseEstimate.LATE_LUTEAL]:
            ambient_visual = "companion_cozy_sweater_warm_lamp"

        return WidgetViewPayload(
            companion_visual_state=ambient_visual,
            headline_prompt="Brain & body status right now?",
            quick_tap_emotions=[
                {"label": "Chill", "maps_to": EmotionalState.CALM_REGULATED.value},
                {"label": "20 Tabs Open", "maps_to": EmotionalState.OVERTHINKING_ANXIOUS.value},
                {"label": "Everyone is Annoying", "maps_to": EmotionalState.IRRITABLE_FRUSTRATED.value},
                {"label": "Spiralling", "maps_to": EmotionalState.ACUTE_SPIRAL.value}
            ],
            show_sos_comfort_mode=(phase == PhaseEstimate.MENSTRUAL)
        )

    @staticmethod
    def select_card_deck(contract: SharedCycleStateContract) -> List[CardItem]:
        cards: List[CardItem] = []
        missing = contract.anomaly_telemetry.missing_metrics_today
        conf = contract.cycle_state.phase_confidence
        phase = contract.cycle_state.best_phase_estimate

        if "emotional_state" in missing:
            cards.append(CardItem(
                card_id="frank_emotion_card",
                target_metric="self_reported_emotion",
                question_text="Are we actually stressed about life today, or is your brain's group chat just loud?",
                options=[
                    "Overthinking everything",
                    "Lowkey irritable at everyone",
                    "Just exhausted / zoned out",
                    "Actually doing fine"
                ]
            ))

        if "somatic_pain_and_comfort" in missing or phase in [PhaseEstimate.MENSTRUAL, PhaseEstimate.LATE_LUTEAL]:
            cards.append(CardItem(
                card_id="somatic_pain_card",
                target_metric="cramps_vas_and_relief",
                question_text="How much is your body protesting today?",
                options=[
                    "Send a heating pad immediately (Severe)",
                    "Took pain relief, still hurts",
                    "Dull ache, manageable",
                    "Zero pain today"
                ]
            ))

        if conf < 0.65 or phase == PhaseEstimate.UNCERTAIN_TRANSITION:
            cards.append(CardItem(
                card_id="uncertainty_reducer_card",
                target_metric="confounder_or_somatic",
                question_text="Your rhythm is keeping us guessing this week! Any of these happening?",
                options=[
                    "Pulled late nights / Exam stress",
                    "Feeling pre-period body cues (bloated/warm)",
                    "Period actually started today!",
                    "Nope, just a normal week"
                ]
            ))
        else:
            cards.append(CardItem(
                card_id="craving_gut_card",
                target_metric="gut_and_appetite",
                question_text="What did the comfort-food monster demand today?",
                options=[
                    "Survived on caffeine & sugar",
                    "Ate everything in sight",
                    "Stomach feels weird / bloated",
                    "Kept it fairly normal"
                ]
            ))

        return cards[:3]

    @staticmethod
    def build_notification(contract: SharedCycleStateContract) -> str:
        cs = contract.cycle_state
        win = cs.prediction_window_days

        if cs.best_phase_estimate == PhaseEstimate.MENSTRUAL:
            return (
                "Today's vibe: Low-expectations mode. Keep a warm drink or heat pack close, "
                "and give yourself permission to do the bare minimum today."
            )
        if cs.best_phase_estimate == PhaseEstimate.LATE_LUTEAL:
            return (
                f"Heads-up: You're entering your typical pre-period window (estimated around "
                f"{cs.predicted_next_period_center.strftime('%b %d')} ± {win} days). "
                "If your patience feels thin or cravings spike today, go easy on yourself."
            )
        if cs.best_phase_estimate == PhaseEstimate.UNCERTAIN_TRANSITION:
            return (
                "Checking in: Cycles aren't clocks, and yours is taking a slightly longer scenic route "
                "this month. Totally normal with stress or sleep shifts—how are you feeling today?"
            )
        return (
            "Morning check-in: Looks like a steadier bandwidth window this week. "
            "Good day to clear a couple of things off your plate at your own pace."
        )

    @staticmethod
    def build_voice_companion_config(contract: SharedCycleStateContract) -> VoiceCompanionPromptConfig:
        er = contract.emotional_routing
        cs = contract.cycle_state
        sg = contract.safety_guards

        base_prompt = (
            "You are a warm, grounded, sisterly voice companion inside a cozy sanctuary app. "
            "Keep responses under 3 sentences so you can be spoken aloud naturally. "
            f"PRIMARY USER EMOTIONAL STATE: {er.primary_driver.value}. "
            "STEP 1: Validate her immediate emotional state with zero judgment or toxic positivity. "
        )

        if er.use_cycle_as_supporting_context and er.supporting_hormonal_context:
            base_prompt += (
                f"STEP 2 (OPTIONAL SUPPORTING CONTEXT): Gently mention that she is around Day {cs.cycle_day} "
                f"(estimated {cs.best_phase_estimate.value} phase, confidence {int(cs.phase_confidence*100)}%, "
                f"context: {er.supporting_hormonal_context}), which can naturally amplify physical or emotional heaviness—"
                "but frame it as an uncertainty-aware possibility, never an absolute fact. "
            )
        else:
            base_prompt += (
                "STEP 2: Do NOT blame her feelings on hormones or her cycle today; focus 100% on "
                "comforting her real-life experience and guiding a slow breath. "
            )

        if not sg.allow_pharmacological_suggestions:
            base_prompt += "SAFETY RULE: Never advise taking specific pills or medications on a schedule. "

        opening_line = (
            "Hey, I'm right here. Take a breath—you don't have to hold it all together right now. What's going on?"
            if er.primary_driver in [EmotionalState.ACUTE_SPIRAL, EmotionalState.OVERTHINKING_ANXIOUS]
            else "Hey! How is your head and body feeling today?"
        )

        return VoiceCompanionPromptConfig(
            system_instruction=base_prompt,
            opening_reassurance_line=opening_line,
            ephemeral_mode_active=sg.ephemeral_voice_processing_only
        )

    @classmethod
    def generate_experience_bundle(cls, contract: SharedCycleStateContract) -> DailyUserExperienceBundle:
        doctor_nudge = None
        if contract.safety_guards.allow_long_term_pattern_nudge:
            if contract.anomaly_telemetry.dysmenorrhea_resistance_score >= 0.80:
                doctor_nudge = (
                    "Now that you're in a calmer week: across your last 3 cycles, you logged severe cramps "
                    "that didn't respond well to standard relief. You deserve better comfort than just toughing "
                    "it out—tap here if you want a clean 1-page summary to show a gynaecologist sometime."
                )
            elif contract.anomaly_telemetry.cyclical_luteal_distress_score >= 0.80:
                doctor_nudge = (
                    "Gentle pattern note while you're in a clear-headed week: your sharpest emotional spirals "
                    "have clustered in the final days before your period across 3 cycles. We can export a simple "
                    "chart if you ever want to discuss luteal support options with a doctor."
                )

        return DailyUserExperienceBundle(
            widget=cls.build_widget(contract),
            card_deck=cls.select_card_deck(contract),
            morning_notification=cls.build_notification(contract),
            voice_companion=cls.build_voice_companion_config(contract),
            gentle_doctor_dossier_nudge=doctor_nudge
        )