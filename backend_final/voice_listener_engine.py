from typing import Any, Optional, List, Dict
import re
import os
import asyncio
from datetime import date
from typing import Optional, Tuple, List
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

try:
    from groq import AsyncGroq
except ImportError:
    AsyncGroq = None

from cycle_state_contract import (
    UserPhysiologyProfile,
    DailyObservation,
    EmotionalState,
    PhaseEstimate,
    CycleStateEstimator,
    SharedCycleStateContract
)

# ==========================================
# 1. LISTENER SCHEMAS
# ==========================================

class ExtractedSymptoms(BaseModel):
    detected_emotion: EmotionalState = EmotionalState.UNREPORTED
    detected_cramps_vas: int = Field(default=0, ge=0, le=10)
    pain_relief_mentioned: Optional[bool] = None
    somatic_luteal_detected: bool = False
    is_bleeding_detected: bool = False
    confounder_detected: bool = False


class ListenerResponse(BaseModel):
    companion_reassurance_speech: str
    extracted_symptoms: ExtractedSymptoms
    updated_contract_phase: PhaseEstimate
    silent_log_applied: bool


# ==========================================
# 2. THE SUBTLE LISTENER ENGINE (GROQ AI)
# ==========================================

class SubtleVoiceListener:

    # Preferred models: llama-3.1-8b-instant / llama-3.3-70b-versatile, with openai/gpt-oss-20b fallback
    MODELS: List[str] = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "openai/gpt-oss-20b"]

    @classmethod
    def _get_groq_client(cls) -> Optional[Any]:
        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key or AsyncGroq is None:
            return None
        return AsyncGroq(api_key=api_key, timeout=8.0)

    @classmethod
    async def build_prompt_and_reply(cls, tone: str, memory_context: str, message: str) -> str:
        system_prompt = f"""
Tone: {tone}
Context from previous cycles and sessions:
{memory_context}

Respond directly to the user based on their latest input. If they raise serious health concerns, reassure them and gently advise consulting a doctor.

Crucial Rule: Treat emotional and physical symptoms as temporary, cyclical events tied to her current phase. Reassure her that it is normal to feel this way right now, it will pass, and we will use today's learnings to prepare better choices for her next cycle. Keep response concise, warm, and natural (2-3 empathetic sentences).
"""
        client = cls._get_groq_client()
        if not client:
            print("[VoiceListener Warning]: GROQ_API_KEY not configured or groq SDK missing. Falling back to rule-based companion speech.")
            return "Sorry, I am having trouble connecting right now."

        # Try models in order (free-tier low-latency candidates)
        for model_name in cls.MODELS:
            try:
                print(f"[VoiceListener]: Calling Groq API ({model_name}, timeout=8.0s)...")
                res = await client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": message}
                    ],
                    timeout=8.0
                )

                reply = res.choices[0].message.content if res and res.choices else ""
                if reply and isinstance(reply, str) and reply.strip():
                    return reply.strip()
            except Exception as e:
                err_msg = str(e)
                # If model is unavailable or rate-limited, log warning and try next model
                print(f"[VoiceListener Warning]: Groq model {model_name} call failed: {err_msg}")
                continue

        print("[VoiceListener Error]: All Groq models failed or timed out. Falling back to rule-based speech.")
        return "Sorry, I am having trouble connecting right now."

    @staticmethod
    def _heuristic_extractor(text: str) -> ExtractedSymptoms:
        t = text.lower()
        extracted = ExtractedSymptoms()

        if any(w in t for w in ["spiral", "spiralling", "can't stop crying", "breakdown", "hate my life", "disappear"]):
            extracted.detected_emotion = EmotionalState.ACUTE_SPIRAL
        elif any(w in t for w in ["overthinking", "20 tabs", "anxious", "anxiety", "stressed", "panicking", "racing"]):
            extracted.detected_emotion = EmotionalState.OVERTHINKING_ANXIOUS
        elif any(w in t for w in ["annoying", "irritated", "pissed", "mad", "angry", "snapping", "frustrated"]):
            extracted.detected_emotion = EmotionalState.IRRITABLE_FRUSTRATED
        elif any(w in t for w in ["exhausted", "zero energy", "tired", "drained", "can't move", "sleepy"]):
            extracted.detected_emotion = EmotionalState.EXHAUSTED_LOW
        elif any(w in t for w in ["calm", "chill", "fine", "good", "balanced", "relaxed"]):
            extracted.detected_emotion = EmotionalState.CALM_REGULATED

        if any(w in t for w in ["stomach is twisting", "killing me", "unbearable", "severe cramps", "heating pad immediately"]):
            extracted.detected_cramps_vas = 9
        elif any(w in t for w in ["cramps", "cramping", "back hurts", "period pain", "lower stomach ache"]):
            extracted.detected_cramps_vas = 5

        if any(w in t for w in ["pill didn't work", "took medicine still hurts", "painkiller did nothing"]):
            extracted.pain_relief_mentioned = False
        elif any(w in t for w in ["took a pill", "medicine helped", "painkiller helped"]):
            extracted.pain_relief_mentioned = True

        if any(w in t for w in ["bloated", "bloating", "tender", "hot", "craving", "fries", "chocolate", "sweets", "eating everything"]):
            extracted.somatic_luteal_detected = True

        if any(w in t for w in ["started bleeding", "got my period", "period came", "period started"]):
            extracted.is_bleeding_detected = True

        if any(w in t for w in ["exam", "finals", "pulled an all-nighter", "sick", "fever", "travelling"]):
            extracted.confounder_detected = True

        return extracted

    @staticmethod
    def _generate_companion_speech(
        text: str,
        extracted: ExtractedSymptoms,
        contract: SharedCycleStateContract
    ) -> str:
        cs = contract.cycle_state
        er = contract.emotional_routing

        if extracted.detected_emotion == EmotionalState.ACUTE_SPIRAL:
            if er.use_cycle_as_supporting_context:
                return (
                    "I hear you, take a slow breath. First—nothing is wrong with you for feeling this heavy. "
                    f"You're around Day {cs.cycle_day}, where your calming hormones take a steep drop, so every "
                    "small worry sounds ten times louder tonight. Put the assignment away, drop your shoulders, "
                    "and let's just get you comfortable."
                )
            return (
                "I'm right here with you. Take a slow breath and unclench your jaw. "
                "You don't have to solve your whole life or finish everything tonight. "
                "Close the laptop, grab some water, and let's just focus on getting through this evening."
            )

        if extracted.detected_cramps_vas >= 7:
            return (
                f"Ouch, Day {cs.cycle_day} body ache is real. "
                "Drop whatever you're doing, grab that heating pad or a hot water bottle, and lie flat on your side. "
                "Your only priority right now is easing that tension—everything else can wait."
            )

        if extracted.detected_emotion == EmotionalState.OVERTHINKING_ANXIOUS:
            return (
                "Your mind has about twenty tabs open right now. "
                "Take one physiological sigh with me—two quick inhales, and one long exhale. "
                "Pick just one small thing to finish, and give yourself permission to leave the rest for tomorrow."
            )

        return (
            "I've got you. Thanks for getting that out of your head and into here. "
            "I've quietly noted down how your body and mind are feeling today—take it easy tonight!"
        )

    @classmethod
    def listen_and_reassure(
        cls,
        profile: UserPhysiologyProfile,
        transcript_text: str,
        today: date
    ) -> ListenerResponse:
        extracted = cls._heuristic_extractor(transcript_text)

        obs = next((o for o in profile.recent_observations if o.obs_date == today), None)
        if not obs:
            obs = DailyObservation(obs_date=today)
            profile.recent_observations.append(obs)

        if extracted.detected_emotion != EmotionalState.UNREPORTED:
            obs.self_reported_emotion = extracted.detected_emotion
        if extracted.detected_cramps_vas > 0:
            obs.cramps_vas = extracted.detected_cramps_vas
        if extracted.pain_relief_mentioned is not None:
            obs.pain_relief_effective = extracted.pain_relief_mentioned
        if extracted.somatic_luteal_detected:
            obs.somatic_luteal_markers = True
        if extracted.confounder_detected:
            obs.confounder_flagged = True
        if extracted.is_bleeding_detected:
            obs.is_bleeding = True
            profile.last_period_start = today

        updated_contract = CycleStateEstimator.build_shared_contract(profile, today)
        speech = cls._generate_companion_speech(transcript_text, extracted, updated_contract)

        return ListenerResponse(
            companion_reassurance_speech=speech,
            extracted_symptoms=extracted,
            updated_contract_phase=updated_contract.cycle_state.best_phase_estimate,
            silent_log_applied=True
        )