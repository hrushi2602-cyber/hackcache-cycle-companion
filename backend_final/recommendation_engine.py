import os
import json
import asyncio
from typing import Optional, Any, List
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Core cycle schemas
from cycle_state_contract import PhaseEstimate, EmotionalState
from voice_listener_engine import ExtractedSymptoms

load_dotenv()

try:
    from groq import AsyncGroq
except ImportError:
    AsyncGroq = None


class ActionableSuggestions(BaseModel):
    diet_tips: str = Field(description="Specific nutrition advice tailored to the cycle phase and symptoms.")
    sleep_protocol: str = Field(description="Sleep recommendations considering basal body temperature and fatigue.")
    productivity_grace: str = Field(description="Empathetic productivity advice, validating rest if in luteal phase or exhausted.")


class SuggestionEngine:

    # Preferred models: llama-3.3-70b-versatile for complex reasoning, with openai/gpt-oss-120b fallback
    MODELS: List[str] = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]

    @classmethod
    def _get_groq_client(cls) -> Optional[Any]:
        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key or AsyncGroq is None:
            return None
        return AsyncGroq(api_key=api_key, timeout=8.0)

    @classmethod
    async def generate_dashboard_cards(
        cls,
        phase: PhaseEstimate,
        emotion: EmotionalState,
        symptoms: ExtractedSymptoms
    ) -> ActionableSuggestions:
        system_prompt = f"""
You are an empathetic, science-grounded menstrual health companion.
Generate tailored daily advice based on the user's current physiological state.

Current Phase: {phase.value if hasattr(phase, 'value') else str(phase)}
Emotional State: {emotion.value if hasattr(emotion, 'value') else str(emotion)}
Extracted Symptoms: {symptoms.model_dump() if hasattr(symptoms, 'model_dump') else symptoms}

Output MUST be a valid JSON object matching this schema exactly:
{{
  "diet_tips": "string containing specific nutrition advice",
  "sleep_protocol": "string containing sleep recommendations considering basal body temperature",
  "productivity_grace": "string containing empathetic productivity advice validating rest"
}}

Rules:
1. Productivity: If phase is LUTEAL or energy is EXHAUSTED/LOW, explicitly validate resting and removing hustle guilt.
2. Nutrition: Suggest specific accessible foods (magnesium/iron, warm herbal teas, gentle carbs).
3. Sleep: Adjust protocols based on hormonal shifts (cooler room temperature for luteal phase, dim screens).
4. Tone: Reassuring, warm, like a compassionate older sister. No sterile medical jargon.
"""

        client = cls._get_groq_client()
        if not client:
            print("[SuggestionEngine Warning]: GROQ_API_KEY not configured or groq SDK missing. Returning phase-aligned default cards.")
            return cls._get_phase_fallback(phase, emotion, symptoms)

        # Attempt models in order with strict 8.0s timeout and JSON format
        for model_name in cls.MODELS:
            try:
                print(f"[SuggestionEngine]: Generating cards via Groq ({model_name}, timeout=8.0s)...")
                res = await client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": "Generate today's actionable suggestions in JSON format."}
                    ],
                    response_format={"type": "json_object"},
                    timeout=8.0
                )

                raw_text = res.choices[0].message.content if res and res.choices else ""
                if raw_text and isinstance(raw_text, str) and raw_text.strip():
                    parsed = json.loads(raw_text)
                    return ActionableSuggestions(
                        diet_tips=str(parsed.get("diet_tips", "Stay well hydrated and enjoy warm, easily digestible foods today.")),
                        sleep_protocol=str(parsed.get("sleep_protocol", "Cool down your bedroom and aim for an earlier wind-down routine.")),
                        productivity_grace=str(parsed.get("productivity_grace", "Pace yourself gently today. Rest is a biological requirement."))
                    )
            except Exception as e:
                err_msg = str(e)
                print(f"[SuggestionEngine Warning]: Groq model {model_name} failed: {err_msg}")
                continue

        print("[SuggestionEngine Error]: All Groq models failed. Returning phase-aligned defaults.")
        return cls._get_phase_fallback(phase, emotion, symptoms)

    @classmethod
    def _get_phase_fallback(cls, phase: PhaseEstimate, emotion: EmotionalState, symptoms: ExtractedSymptoms) -> ActionableSuggestions:
        phase_str = (phase.value if hasattr(phase, 'value') else str(phase)).lower()
        if "luteal" in phase_str:
            return ActionableSuggestions(
                diet_tips="Prioritize magnesium-rich snacks (dark chocolate, pumpkin seeds, bananas) and avoid heavy sodium to ease bloating.",
                sleep_protocol="Your core body temperature is naturally higher in the luteal phase. Keep your room cooler (19-20°C) and dim screens early.",
                productivity_grace="Give yourself permission to slow down. High-stakes multitasking can wait; focus on one gentle task at a time."
            )
        elif "menstrual" in phase_str:
            return ActionableSuggestions(
                diet_tips="Focus on warm, iron-rich, easily digestible comfort foods (lentil soups, warm ginger-ajwain tea, khichdi).",
                sleep_protocol="Curl up on your side with a pillow between your knees to relieve pelvic pressure and ease uterine cramps.",
                productivity_grace="Honor the physical demand of bleeding. Drop non-urgent obligations without an ounce of guilt."
            )
        elif "follicular" in phase_str:
            return ActionableSuggestions(
                diet_tips="Your metabolism is efficient right now. Support rising estrogen with crisp salads, lean proteins, and fermented foods.",
                sleep_protocol="Your energy is naturally rebuilding. Maintain consistent wake times to capitalize on your morning focus.",
                productivity_grace="This is your optimal window for brainstorming, learning new skills, and tackling mentally demanding work."
            )
        else: # ovulatory or default
            return ActionableSuggestions(
                diet_tips="Stay hydrated with electrolytes and plenty of fiber to help your liver metabolize peak estrogen smoothly.",
                sleep_protocol="High energy might delay sleep onset. Avoid late caffeine and wind down with relaxing reading or deep breathing.",
                productivity_grace="Your verbal clarity and social energy are at their peak. Great time for presentations and meaningful discussions."
            )