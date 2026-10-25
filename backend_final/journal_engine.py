import os
import json
import asyncio
from typing import Optional, Any, List
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

try:
    from groq import AsyncGroq
except ImportError:
    AsyncGroq = None


class CycleReflection(BaseModel):
    strong_days_overview: str = Field(description="Uplifting summary of her high-energy, focused days.")
    weak_days_overview: str = Field(description="Empathetic summary of her low-energy, difficult days, validating her need for rest.")
    pattern_insight: str = Field(description="A warm takeaway connecting her cycle phases to these emotional shifts.")


class JournalEngine:

    # Preferred models: llama-3.3-70b-versatile for structured reasoning, with openai/gpt-oss-120b fallback
    MODELS: List[str] = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]

    @classmethod
    def _get_groq_client(cls) -> Optional[Any]:
        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key or AsyncGroq is None:
            return None
        return AsyncGroq(api_key=api_key, timeout=8.0)

    @classmethod
    async def generate_journal_summary(cls, recent_vents: List[str]) -> CycleReflection:
        system_prompt = f"""
You are an empathetic, insightful health companion.
Review the user's recent voice vents:
{recent_vents}

Categorize her experiences into 'strong days' and 'weak days'.
Rule 1: Never judge the weak days. Frame exhaustion, cramping, and anxiety as natural biological cues to rest.
Rule 2: Highlight her resilience and mental clarity on the strong days.

Output MUST be a valid JSON object matching this schema exactly:
{{
  "strong_days_overview": "Uplifting summary of her high-energy, focused days",
  "weak_days_overview": "Empathetic summary of her low-energy days, validating her need for rest",
  "pattern_insight": "A warm takeaway connecting her cycle phases to these emotional shifts"
}}
"""

        client = cls._get_groq_client()
        if not client:
            print("[JournalEngine Warning]: GROQ_API_KEY not configured or groq SDK missing. Returning safe cycle reflection.")
            return cls._get_default_reflection()

        for model_name in cls.MODELS:
            try:
                print(f"[JournalEngine]: Synthesizing reflection via Groq ({model_name}, timeout=8.0s)...")
                res = await client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": "Generate the cycle reflection journal in JSON format."}
                    ],
                    response_format={"type": "json_object"},
                    timeout=8.0
                )

                raw_text = res.choices[0].message.content if res and res.choices else ""
                if raw_text and isinstance(raw_text, str) and raw_text.strip():
                    parsed = json.loads(raw_text)
                    return CycleReflection(
                        strong_days_overview=str(parsed.get("strong_days_overview", "You had moments of sharp clarity and resilience earlier in your cycle.")),
                        weak_days_overview=str(parsed.get("weak_days_overview", "Your body asked for extra rest during heavier symptom flares, which is a healthy protective cue.")),
                        pattern_insight=str(parsed.get("pattern_insight", "Your energy ebbs and flows cyclically with your hormonal shifts. Honoring both phases creates sustainable balance."))
                    )
            except Exception as e:
                err_msg = str(e)
                print(f"[JournalEngine Warning]: Groq model {model_name} failed: {err_msg}")
                continue

        print("[JournalEngine Error]: All Groq models failed. Returning safe reflection.")
        return cls._get_default_reflection()

    @classmethod
    def _get_default_reflection(cls) -> CycleReflection:
        return CycleReflection(
            strong_days_overview="You had noticeable moments of focus, creative clarity, and resilience this cycle.",
            weak_days_overview="Your body naturally asked for extra rest during low-progesterone shifts, validating your need to slow down.",
            pattern_insight="Your energy naturally ebbs and flows with your cycle. We track these shifts so you can pace your commitments with less guilt."
        )