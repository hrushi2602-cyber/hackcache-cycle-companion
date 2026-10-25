import os
from datetime import date, timedelta
from enum import Enum
from typing import List, Dict, Optional, Tuple
from pydantic import BaseModel, Field
import numpy as np
from motor.motor_asyncio import AsyncIOMotorClient

# ==========================================
# DATABASE & MEMORY CONFIGURATION
# ==========================================
MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("DATABASE_URL") or "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=2000)
try:
    db = client.get_default_database()
except Exception:
    db = client.hackcache_db
memory_collection = db.memory_summaries

class ChatRequest(BaseModel):
    message: str
    tone: Optional[str] = "reassuring, gentle, and empathetic"

# ==========================================
# 1. ENUMS & EVIDENCE TAXONOMY
# ==========================================

class PhaseEstimate(str, Enum):
    MENSTRUAL = "menstrual"
    FOLLICULAR = "follicular"
    PERIOVULATORY_WINDOW = "periovulatory_window" # Never claim exact "ovulation" without BBT/LH
    EARLY_LUTEAL = "early_luteal"
    LATE_LUTEAL = "late_luteal"
    UNCERTAIN_TRANSITION = "uncertain_transition" # Used when cycle exceeds expected bounds

class EvidenceSource(str, Enum):
    ONBOARDING_PRIOR_ONLY = "onboarding_prior_only"       # 0 past cycles logged
    CALENDAR_STATISTICAL = "calendar_statistical"         # Based on historical bleed dates
    CALENDAR_PLUS_SOMATIC = "calendar_plus_somatic"       # Reinforced by logged physical markers
    DIRECT_BLEED_LOG = "direct_bleed_log"                 # User actively logging bleeding now

class EmotionalState(str, Enum):
    UNREPORTED = "unreported"
    CALM_REGULATED = "calm_regulated"
    OVERTHINKING_ANXIOUS = "overthinking_anxious"
    IRRITABLE_FRUSTRATED = "irritable_frustrated"
    EXHAUSTED_LOW = "exhausted_low"
    ACUTE_SPIRAL = "acute_spiral"

# ==========================================
# 2. INPUT LOGS & USER PROFILE
# ==========================================

class DailyObservation(BaseModel):
    obs_date: date
    is_bleeding: bool = False
    cramps_vas: int = Field(default=0, ge=0, le=10)
    pain_relief_effective: Optional[bool] = None
    self_reported_emotion: EmotionalState = EmotionalState.UNREPORTED
    somatic_luteal_markers: bool = False  # E.g., breast tenderness, luteal bloating, thermal shift
    confounder_flagged: bool = False      # Exams, illness, travel, emergency pill

class CycleRecord(BaseModel):
    length_days: int
    is_confounded: bool = False           # Prevents outlier cycles from corrupting baseline

class UserPhysiologyProfile(BaseModel):
    user_id: str
    last_period_start: date
    typical_bleed_days: int = 5
    cycle_history: List[CycleRecord] = []
    recent_observations: List[DailyObservation] = []

# ==========================================
# 3. THE SHARED STATE CONTRACT (SINGLE SOURCE OF TRUTH)
# ==========================================

class CycleEstimateBlock(BaseModel):
    cycle_day: int
    best_phase_estimate: PhaseEstimate
    phase_probabilities: Dict[PhaseEstimate, float] # Soft distribution across phases
    phase_confidence: float = Field(ge=0.0, le=1.0)
    uncertainty_reason: str
    evidence_source: EvidenceSource
    ewma_baseline_length: float
    bayesian_posterior_length: float
    predicted_next_period_center: date
    prediction_window_days: int                     # E.g., +/- 3 days (68% credible interval)

class EmotionalRoutingBlock(BaseModel):
    primary_driver: EmotionalState                  # ALWAYS drives support first
    use_cycle_as_supporting_context: bool           # True ONLY if phase confidence >= 0.65
    supporting_hormonal_context: Optional[str]      # E.g., "late_luteal_progesterone_withdrawal"

class LongitudinalAnomalyBlock(BaseModel):
    dysmenorrhea_resistance_score: float = Field(ge=0.0, le=1.0)
    cyclical_luteal_distress_score: float = Field(ge=0.0, le=1.0)
    cycle_length_variance_score: float = Field(ge=0.0, le=1.0)
    missing_metrics_today: List[str]                # Tells Card Engine what data is missing

class SafetyAndPrivacyGuards(BaseModel):
    allow_pharmacological_suggestions: bool = False # HARD-LOCKED FALSE: Never prescribe meds
    allow_long_term_pattern_nudge: bool             # True ONLY in calm state + Follicular phase
    acute_medical_red_flag: bool                    # True if VAS=10 + sudden onset
    ephemeral_voice_processing_only: bool = True    # Raw audio/vent text must not persist

class SharedCycleStateContract(BaseModel):
    as_of_date: date
    cycle_state: CycleEstimateBlock
    emotional_routing: EmotionalRoutingBlock
    anomaly_telemetry: LongitudinalAnomalyBlock
    safety_guards: SafetyAndPrivacyGuards

# ==========================================
# 4. STATISTICAL & BAYESIAN ESTIMATION ENGINE
# ==========================================

class CycleStateEstimator:
    PRIOR_MEAN = 28.5
    PRIOR_VAR = 12.25        
    INTRA_USER_VAR = 6.25    
    LUTEAL_MEAN = 12.5       

    @classmethod
    def compute_cycle_statistics(cls, history: List[CycleRecord]) -> Tuple[float, float, int, EvidenceSource]:
        clean_lengths = [c.length_days for c in history if not c.is_confounded and 21 <= c.length_days <= 45]
        n = len(clean_lengths)

        if n == 0:
            return cls.PRIOR_MEAN, cls.PRIOR_MEAN, 4, EvidenceSource.ONBOARDING_PRIOR_ONLY

        alpha = 0.4
        ewma = float(clean_lengths[0])
        for val in clean_lengths[1:]:
            ewma = alpha * val + (1 - alpha) * ewma

        sample_mean = float(np.mean(clean_lengths))
        posterior_var = 1.0 / ((1.0 / cls.PRIOR_VAR) + (n / cls.INTRA_USER_VAR))
        posterior_mean = posterior_var * ((cls.PRIOR_MEAN / cls.PRIOR_VAR) + (n * sample_mean / cls.INTRA_USER_VAR))

        empirical_var = float(np.var(clean_lengths)) if n >= 3 else 0.0
        total_pred_sd = np.sqrt(posterior_var + max(cls.INTRA_USER_VAR, empirical_var))
        uncertainty_days = max(2, int(round(1.28 * total_pred_sd))) 

        return round(ewma, 1), round(posterior_mean, 1), uncertainty_days, EvidenceSource.CALENDAR_STATISTICAL

    @classmethod
    def estimate_phase_distribution(
        cls,
        cycle_day: int,
        bleed_days: int,
        expected_len: float,
        uncertainty_days: int,
        today_obs: Optional[DailyObservation],
        base_evidence: EvidenceSource
    ) -> Tuple[PhaseEstimate, Dict[PhaseEstimate, float], float, str, EvidenceSource]:
        if today_obs and today_obs.is_bleeding:
            probs = {p: 0.0 for p in PhaseEstimate}
            probs[PhaseEstimate.MENSTRUAL] = 0.98
            return (
                PhaseEstimate.MENSTRUAL, probs, 0.98,
                "Confirmed via direct bleeding log today.",
                EvidenceSource.DIRECT_BLEED_LOG
            )

        if cycle_day > expected_len + uncertainty_days:
            probs = {p: 0.05 for p in PhaseEstimate}
            probs[PhaseEstimate.UNCERTAIN_TRANSITION] = 0.75
            probs[PhaseEstimate.LATE_LUTEAL] = 0.20
            return (
                PhaseEstimate.UNCERTAIN_TRANSITION, probs, 0.30,
                "Cycle day exceeds predicted window; delayed follicular phase or unlogged period.",
                base_evidence
            )

        est_ovulation_center = expected_len - cls.LUTEAL_MEAN
        dist_from_ov = cycle_day - est_ovulation_center
        days_to_end = expected_len - cycle_day

        raw_probs = {
            PhaseEstimate.MENSTRUAL: 0.85 if cycle_day <= bleed_days else max(0.01, np.exp(-0.8 * (cycle_day - bleed_days))),
            PhaseEstimate.FOLLICULAR: float(np.exp(-0.5 * ((cycle_day - (bleed_days + est_ovulation_center) / 2.0) / 3.0) ** 2)) if cycle_day > bleed_days else 0.1,
            PhaseEstimate.PERIOVULATORY_WINDOW: float(np.exp(-0.5 * (dist_from_ov / max(2.0, uncertainty_days * 0.7)) ** 2)),
            PhaseEstimate.EARLY_LUTEAL: float(np.exp(-0.5 * ((dist_from_ov - 4.5) / 2.5) ** 2)),
            PhaseEstimate.LATE_LUTEAL: float(np.exp(-0.5 * ((days_to_end - 2.5) / 2.5) ** 2)) if days_to_end >= -2 else 0.2,
            PhaseEstimate.UNCERTAIN_TRANSITION: 0.05
        }

        evidence = base_evidence
        if today_obs and today_obs.somatic_luteal_markers and dist_from_ov > 0:
            raw_probs[PhaseEstimate.EARLY_LUTEAL] *= 1.35
            raw_probs[PhaseEstimate.LATE_LUTEAL] *= 1.35
            evidence = EvidenceSource.CALENDAR_PLUS_SOMATIC

        total = sum(raw_probs.values())
        norm_probs = {k: round(v / total, 2) for k, v in raw_probs.items()}
        best_phase = max(norm_probs, key=norm_probs.get)
        
        variance_penalty = 0.80 if evidence == EvidenceSource.ONBOARDING_PRIOR_ONLY else max(0.65, 1.0 - (uncertainty_days - 2) * 0.08)
        confidence = round(min(0.95, norm_probs[best_phase] * variance_penalty * 1.3), 2)

        reason = (
            f"Calendar estimate (+/- {uncertainty_days}d window); no direct ovulation biosensor."
            if evidence != EvidenceSource.CALENDAR_PLUS_SOMATIC
            else f"Calendar estimate reinforced by logged somatic luteal markers."
        )
        return best_phase, norm_probs, confidence, reason, evidence

    @classmethod
    def build_shared_contract(cls, profile: UserPhysiologyProfile, today: date) -> SharedCycleStateContract:
        cycle_day = (today - profile.last_period_start).days + 1
        ewma_len, bayes_len, uncertainty_days, base_ev = cls.compute_cycle_statistics(profile.cycle_history)

        today_obs = next((o for o in profile.recent_observations if o.obs_date == today), None)

        best_phase, probs, conf, reason, final_ev = cls.estimate_phase_distribution(
            cycle_day=cycle_day,
            bleed_days=profile.typical_bleed_days,
            expected_len=bayes_len,
            uncertainty_days=uncertainty_days,
            today_obs=today_obs,
            base_evidence=base_ev
        )

        next_period_center = profile.last_period_start + timedelta(days=int(round(ewma_len)))

        reported_emotion = today_obs.self_reported_emotion if today_obs else EmotionalState.UNREPORTED
        use_cycle_context = (conf >= 0.60) and (best_phase in [PhaseEstimate.MENSTRUAL, PhaseEstimate.LATE_LUTEAL])
        
        hormonal_context = None
        if use_cycle_context:
            if best_phase == PhaseEstimate.LATE_LUTEAL:
                hormonal_context = "potential_late_luteal_progesterone_withdrawal"
            elif best_phase == PhaseEstimate.MENSTRUAL:
                hormonal_context = "menstrual_prostaglandin_and_low_estrogen_window"

        valid_obs = [o for o in profile.recent_observations if not o.confounder_flagged]
        severe_resistant_pain_days = sum(1 for o in valid_obs if o.cramps_vas >= 8 and o.pain_relief_effective is False)
        dysmenorrhea_score = min(1.0, round(severe_resistant_pain_days / 6.0, 2)) 

        luteal_spirals = sum(1 for o in valid_obs if o.self_reported_emotion == EmotionalState.ACUTE_SPIRAL)
        luteal_distress_score = min(1.0, round(luteal_spirals / 6.0, 2))

        clean_lengths = [c.length_days for c in profile.cycle_history if not c.is_confounded]
        if len(clean_lengths) >= 3 and (max(clean_lengths[-3:]) - min(clean_lengths[-3:]) > 9 or np.mean(clean_lengths[-3:]) > 35):
            variance_score = 0.85
        else:
            variance_score = 0.15

        missing_today = []
        if not today_obs or today_obs.self_reported_emotion == EmotionalState.UNREPORTED:
            missing_today.append("emotional_state")
        if not today_obs or (best_phase in [PhaseEstimate.MENSTRUAL, PhaseEstimate.LATE_LUTEAL] and today_obs.cramps_vas == 0):
            missing_today.append("somatic_pain_and_comfort")

        is_calm_follicular = (
            best_phase == PhaseEstimate.FOLLICULAR
            and reported_emotion in [EmotionalState.CALM_REGULATED, EmotionalState.UNREPORTED]
        )
        has_high_anomaly = max(dysmenorrhea_score, luteal_distress_score, variance_score) >= 0.80
        red_flag = bool(today_obs and today_obs.cramps_vas == 10)

        return SharedCycleStateContract(
            as_of_date=today,
            cycle_state=CycleEstimateBlock(
                cycle_day=cycle_day,
                best_phase_estimate=best_phase,
                phase_probabilities=probs,
                phase_confidence=conf,
                uncertainty_reason=reason,
                evidence_source=final_ev,
                ewma_baseline_length=ewma_len,
                bayesian_posterior_length=bayes_len,
                predicted_next_period_center=next_period_center,
                prediction_window_days=uncertainty_days
            ),
            emotional_routing=EmotionalRoutingBlock(
                primary_driver=reported_emotion,
                use_cycle_as_supporting_context=use_cycle_context,
                supporting_hormonal_context=hormonal_context
            ),
            anomaly_telemetry=LongitudinalAnomalyBlock(
                dysmenorrhea_resistance_score=dysmenorrhea_score,
                cyclical_luteal_distress_score=luteal_distress_score,
                cycle_length_variance_score=variance_score,
                missing_metrics_today=missing_today
            ),
            safety_guards=SafetyAndPrivacyGuards(
                allow_pharmacological_suggestions=False,
                allow_long_term_pattern_nudge=(is_calm_follicular and has_high_anomaly),
                acute_medical_red_flag=red_flag,
                ephemeral_voice_processing_only=True
            )
        )