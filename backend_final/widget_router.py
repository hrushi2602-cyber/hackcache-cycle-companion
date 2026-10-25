from pydantic import BaseModel
from cycle_state_contract import PhaseEstimate, EmotionalState
from voice_listener_engine import ExtractedSymptoms

class WidgetDecision(BaseModel):
    widget_type: str
    display_text: str

class WidgetRouter:
    @classmethod
    def determine_ui_state(
        cls, 
        phase: PhaseEstimate, 
        emotion: EmotionalState, 
        symptoms: ExtractedSymptoms, 
        hours_since_last_log: float
    ) -> WidgetDecision:
        
        # 1. State Transience (Time Decay)
        # If it has been over 18 hours, do not assume she is still anxious or in pain.
        if hours_since_last_log > 18:
            if phase in [PhaseEstimate.EARLY_LUTEAL, PhaseEstimate.LATE_LUTEAL, PhaseEstimate.MENSTRUAL]:
                return WidgetDecision(
                    widget_type="QUESTION", 
                    display_text="Just checking in. Are you still feeling drained today, or has the heaviness lifted?"
                )
            return WidgetDecision(
                widget_type="QUESTION", 
                display_text="How is your energy flowing today?"
            )

        # 2. Phase & Emotion Matrix (Recent State)
        is_vulnerable_phase = phase in [PhaseEstimate.LATE_LUTEAL, PhaseEstimate.MENSTRUAL]
        is_struggling = emotion == EmotionalState.EXHAUSTED_LOW # Adjust to match your exact Enum

        if is_vulnerable_phase and is_struggling:
            return WidgetDecision(
                widget_type="COMFORT", 
                display_text="This anxiety is just the luteal shift talking. You are safe, and it will pass soon. Just rest."
            )

        # 3. Symptom Intervention
        if symptoms.detected_cramps_vas and symptoms.detected_cramps_vas >= 6:
            return WidgetDecision(
                widget_type="SUGGESTION", 
                display_text="Since your cramps were flaring up earlier, try sipping some hot ginger tea and applying a heat pad now."
            )

        # 4. Default for High Energy Phases
        return WidgetDecision(
            widget_type="SUGGESTION", 
            display_text="Your body is building energy right now. Great time to tackle that pending assignment."
        )