from datetime import date
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from cycle_state_contract import (
    UserPhysiologyProfile,
    DailyObservation,
    EmotionalState,
    PhaseEstimate,
    CycleStateEstimator,
    SharedCycleStateContract
)

# ==========================================
# 1. QUESTION, SUGGESTION & NOTIFICATION MODELS
# ==========================================

class QuestionOption(BaseModel):
    option_id: str
    label: str
    maps_to_emotion: Optional[EmotionalState] = None
    maps_to_cramps_vas: Optional[int] = None
    maps_to_pain_relief_worked: Optional[bool] = None
    maps_to_somatic_luteal: Optional[bool] = None
    maps_to_confounder: Optional[bool] = None
    maps_to_is_bleeding: Optional[bool] = None

class InteractiveQuestionCard(BaseModel):
    card_id: str
    category: str
    prompt: str
    options: List[QuestionOption]

class UserCardSubmission(BaseModel):
    obs_date: date
    selected_option_ids: List[str]

class ScheduledNotification(BaseModel):
    trigger_time_slot: str   # "09:00_MORNING", "14:30_AFTERNOON", "20:30_EVENING"
    notification_type: str   # "productivity_pacing", "emotional_guardrail", "somatic_comfort", "cycle_forecast"
    title: str
    body: str

class PhaseAndProductivitySuggestion(BaseModel):
    cycle_day: int
    phase_title: str
    phase_explanation: str
    productivity_forecast: str
    actionable_suggestions: List[str]
    reassurance_receipt: str
    scheduled_notifications: List[ScheduledNotification]  # <--- NEW: Notifications driven by her answers!


# ==========================================
# 2. QUESTION BANK & SUGGESTION + NOTIFICATION ENGINE
# ==========================================

class QuestionAndSuggestionEngine:

    @staticmethod
    def get_daily_question_cards(contract: SharedCycleStateContract) -> List[InteractiveQuestionCard]:
        phase = contract.cycle_state.best_phase_estimate
        conf = contract.cycle_state.phase_confidence
        cards: List[InteractiveQuestionCard] = []

        # Card 1: Emotional & Mental Bandwidth
        cards.append(InteractiveQuestionCard(
            card_id="card_emotion",
            category="mind_and_mood",
            prompt="Are we actually stressed about life today, or did hormones hijack the group chat in your head?",
            options=[
                QuestionOption(option_id="emo_calm", label="Locked in & chill", maps_to_emotion=EmotionalState.CALM_REGULATED),
                QuestionOption(option_id="emo_anxious", label="20 tabs open / Overthinking", maps_to_emotion=EmotionalState.OVERTHINKING_ANXIOUS),
                QuestionOption(option_id="emo_irritable", label="Everyone is lowkey annoying", maps_to_emotion=EmotionalState.IRRITABLE_FRUSTRATED),
                QuestionOption(option_id="emo_exhausted", label="Zero battery / Zoned out", maps_to_emotion=EmotionalState.EXHAUSTED_LOW),
                QuestionOption(option_id="emo_spiral", label="Full-on spiralling today", maps_to_emotion=EmotionalState.ACUTE_SPIRAL),
            ]
        ))

        # Card 2: Somatic / Physical State
        if phase in [PhaseEstimate.MENSTRUAL, PhaseEstimate.LATE_LUTEAL]:
            cards.append(InteractiveQuestionCard(
                card_id="card_pain",
                category="body_and_pain",
                prompt="How much is your body protesting right now?",
                options=[
                    QuestionOption(option_id="pain_severe_resistant", label="Took pain relief, still hurts badly", maps_to_cramps_vas=9, maps_to_pain_relief_worked=False),
                    QuestionOption(option_id="pain_severe", label="Send a heating pad immediately", maps_to_cramps_vas=8, maps_to_pain_relief_worked=True),
                    QuestionOption(option_id="pain_mild", label="Dull ache / backache, manageable", maps_to_cramps_vas=4),
                    QuestionOption(option_id="pain_none", label="No cramps today", maps_to_cramps_vas=0),
                ]
            ))
        else:
            cards.append(InteractiveQuestionCard(
                card_id="card_somatic",
                category="body_cues",
                prompt="How is your physical energy holding up today?",
                options=[
                    QuestionOption(option_id="som_high", label="High energy, feeling strong", maps_to_cramps_vas=0),
                    QuestionOption(option_id="som_luteal_cues", label="Feeling bloated / warmer / tender", maps_to_somatic_luteal=True),
                    QuestionOption(option_id="som_bleed_started", label="Surprise! Period started today", maps_to_is_bleeding=True),
                ]
            ))

        # Card 3: Confounder Probe OR Craving Check
        if conf < 0.65 or phase == PhaseEstimate.UNCERTAIN_TRANSITION:
            cards.append(InteractiveQuestionCard(
                card_id="card_confounder",
                category="routine_check",
                prompt="Your cycle is keeping us guessing this week! Any chaos behind the scenes?",
                options=[
                    QuestionOption(option_id="conf_stress", label="Exam stress / pulled late nights", maps_to_confounder=True),
                    QuestionOption(option_id="conf_sick", label="Travelled or fell sick recently", maps_to_confounder=True),
                    QuestionOption(option_id="conf_normal", label="Nope, totally normal routine", maps_to_confounder=False),
                ]
            ))
        else:
            cards.append(InteractiveQuestionCard(
                card_id="card_cravings",
                category="fuel_and_gut",
                prompt="What did the comfort-food monster demand today?",
                options=[
                    QuestionOption(option_id="gut_sugar", label="Survived on caffeine & sugar", maps_to_somatic_luteal=True),
                    QuestionOption(option_id="gut_hungry", label="Extra hungry, ate everything", maps_to_somatic_luteal=True),
                    QuestionOption(option_id="gut_normal", label="Kept meals fairly normal", maps_to_somatic_luteal=False),
                ]
            ))

        return cards

    @classmethod
    def process_answers_and_suggest(
        cls,
        profile: UserPhysiologyProfile,
        submission: UserCardSubmission
    ) -> PhaseAndProductivitySuggestion:
        initial_contract = CycleStateEstimator.build_shared_contract(profile, submission.obs_date)
        active_cards = cls.get_daily_question_cards(initial_contract)
        option_lookup: Dict[str, QuestionOption] = {
            opt.option_id: opt for card in active_cards for opt in card.options
        }

        obs = next((o for o in profile.recent_observations if o.obs_date == submission.obs_date), None)
        if not obs:
            obs = DailyObservation(obs_date=submission.obs_date)
            profile.recent_observations.append(obs)

        for opt_id in submission.selected_option_ids:
            opt = option_lookup.get(opt_id)
            if not opt:
                continue
            if opt.maps_to_emotion is not None:
                obs.self_reported_emotion = opt.maps_to_emotion
            if opt.maps_to_cramps_vas is not None:
                obs.cramps_vas = opt.maps_to_cramps_vas
            if opt.maps_to_pain_relief_worked is not None:
                obs.pain_relief_effective = opt.maps_to_pain_relief_worked
            if opt.maps_to_somatic_luteal is not None:
                obs.somatic_luteal_markers = opt.maps_to_somatic_luteal
            if opt.maps_to_confounder is not None:
                obs.confounder_flagged = opt.maps_to_confounder
            if opt.maps_to_is_bleeding is not None and opt.maps_to_is_bleeding:
                obs.is_bleeding = True
                profile.last_period_start = submission.obs_date

        updated_contract = CycleStateEstimator.build_shared_contract(profile, submission.obs_date)
        return cls._build_suggestion_and_notifications(updated_contract, obs, submission.selected_option_ids)

    @staticmethod
    def _build_suggestion_and_notifications(
        contract: SharedCycleStateContract,
        today_obs: DailyObservation,
        selected_ids: List[str]
    ) -> PhaseAndProductivitySuggestion:
        cs = contract.cycle_state
        phase = cs.best_phase_estimate
        emotion = contract.emotional_routing.primary_driver
        conf_pct = int(cs.phase_confidence * 100)

        is_distressed = emotion in [
            EmotionalState.ACUTE_SPIRAL,
            EmotionalState.OVERTHINKING_ANXIOUS,
            EmotionalState.EXHAUSTED_LOW,
            EmotionalState.IRRITABLE_FRUSTRATED
        ] or today_obs.cramps_vas >= 6

        notifs: List[ScheduledNotification] = []

        # ---------------------------------------------------------
        # 1. FOLLICULAR PHASE
        # ---------------------------------------------------------
        if phase == PhaseEstimate.FOLLICULAR:
            phase_title = f"Follicular Phase (Day {cs.cycle_day} • {conf_pct}% est.)"
            phase_exp = (
                "Your period is behind you and estrogen is steadily climbing, which boosts "
                "verbal memory, focus, and physical stamina."
            )
            if is_distressed:
                prod_forecast = (
                    "Even though this is usually a high-focus hormonal window, you logged feeling "
                    "drained/overwhelmed today. Always listen to your body over the calendar."
                )
                suggestions = [
                    "Pause the heavy tasks: pick just ONE small priority today and leave the rest.",
                    "Step away from screens for 15 minutes to reset your nervous system.",
                    "Check your sleep and hydration—outside stress can override follicular energy."
                ]
                receipt = "Logged! Calendar says high-energy week, but real life wins. Take it slow today."
                notifs.append(ScheduledNotification(
                    trigger_time_slot="15:00_AFTERNOON",
                    notification_type="emotional_guardrail",
                    title="Permission to Coast Today",
                    body="We paused the high-productivity nudges for today. Just finish your one tiny task and log off early."
                ))
            else:
                prod_forecast = (
                    "Peak Productive Window! Your brain is primed for deep focus, problem-solving, "
                    "and learning new concepts right now."
                )
                suggestions = [
                    "Front-load your hardest work: tackle heavy coding, study chapters, or complex assignments this week.",
                    "Great window for high-intensity workouts or strength training—muscle recovery is faster right now.",
                    "Schedule brainstorms or start new projects while your mental battery is high."
                ]
                receipt = "Logged! You're in your clear-headed Follicular runway—make the most of this bandwidth."
                notifs.append(ScheduledNotification(
                    trigger_time_slot="14:30_AFTERNOON",
                    notification_type="productivity_pacing",
                    title="High-Focus Window Active ⚡",
                    body=f"Day {cs.cycle_day} Follicular boost: Your brain is at peak problem-solving capacity. Good block to tackle your hardest task!"
                ))
                notifs.append(ScheduledNotification(
                    trigger_time_slot="09:00_TOMORROW",
                    notification_type="cycle_forecast",
                    title="Tomorrow's Bandwidth Forecast",
                    body="Still riding your clear-headed Follicular wave tomorrow—front-load your heavy work before next week's shift."
                ))

        # ---------------------------------------------------------
        # 2. PERIOVULATORY WINDOW
        # ---------------------------------------------------------
        elif phase == PhaseEstimate.PERIOVULATORY_WINDOW:
            phase_title = f"Mid-Cycle / Periovulatory Window (Day {cs.cycle_day} • {conf_pct}% est.)"
            phase_exp = (
                "Estrogen peaks around this window. Confidence and social battery usually hit their highest point "
                "of the month, though extra caffeine can sometimes feel like jittery anxiety."
            )
            prod_forecast = (
                "High Social & Communication Bandwidth! Best days for presentations, interviews, "
                "team discussions, or pitching ideas."
            )
            suggestions = [
                "Knock out collaborative work, group meetings, or tough conversations over the next 2–3 days.",
                "If your mind feels racey/jittery, swap afternoon coffee for water or herbal tea.",
                "Wrap up pending deadlines before your calmer luteal phase starts next week."
            ]
            receipt = "Logged! Mid-cycle energy is peaking—pace your caffeine and use the social boost."
            notifs.append(ScheduledNotification(
                trigger_time_slot="14:00_AFTERNOON",
                notification_type="productivity_pacing",
                title="Peak Social Battery Window 💬",
                body="Great afternoon to clear out pending emails, group syncs, or presentations. Skip the 4 PM coffee if you feel restless!"
            ))

        # ---------------------------------------------------------
        # 3. EARLY LUTEAL PHASE
        # ---------------------------------------------------------
        elif phase == PhaseEstimate.EARLY_LUTEAL:
            phase_title = f"Early Luteal Phase (Day {cs.cycle_day} • {conf_pct}% est.)"
            phase_exp = (
                "Progesterone is rising, which acts as a warm, calming hormone but also raises your core "
                "body temperature slightly and increases daily calorie burn by ~100–250 kcal."
            )
            prod_forecast = (
                "Steady Wrap-Up Mode. Your brain shifts from starting shiny new things to wanting "
                "to organize, edit, and finish existing tasks."
            )
            suggestions = [
                "Focus on solo deep work: reviewing notes, debugging, organizing files, and clearing your inbox.",
                "Don't fight the extra hunger—add protein and complex carbs so your afternoon energy doesn't crash.",
                "Start winding down heavy commitments before next week's pre-period dip."
            ]
            receipt = "Logged! Progesterone is rising—great week for steady solo work and extra snacks."
            notifs.append(ScheduledNotification(
                trigger_time_slot="16:00_AFTERNOON",
                notification_type="somatic_comfort",
                title="4 PM Fuel Check 🍌",
                body="Your body burns ~200 extra calories a day in the luteal phase. Grab a real snack now so your energy doesn't crash tonight."
            ))

        # ---------------------------------------------------------
        # 4. LATE LUTEAL PHASE
        # ---------------------------------------------------------
        elif phase == PhaseEstimate.LATE_LUTEAL:
            phase_title = f"Late Luteal Phase (Day {cs.cycle_day} • Next period ~{cs.predicted_next_period_center.strftime('%b %d')} ± {cs.prediction_window_days}d)"
            phase_exp = (
                "Estrogen and progesterone are dropping sharply right now, which temporarily lowers serotonin "
                "and makes your brain's stress filter extra sensitive."
            )
            prod_forecast = (
                "Low-Bandwidth Protection Mode. Brain fog and lower patience are biological right now—"
                "avoid scheduling high-stakes deadlines or all-nighters if you can."
            )
            suggestions = [
                "Break tasks into tiny 20-minute chunks instead of forcing 3-hour marathons.",
                "Postpone big emotional decisions or relationship arguments for 72 hours.",
                "Keep dark chocolate, roasted chana, or banana handy to soften the serotonin dip."
            ]
            receipt = (
                "Logged! For the record, your hormones are nose-diving right on schedule—that's why your "
                "brain wants comfort food and feels overstimulated. Be extra gentle with yourself tonight."
            )
            notifs.append(ScheduledNotification(
                trigger_time_slot="16:30_AFTERNOON",
                notification_type="emotional_guardrail",
                title="Late-Luteal Reality Check 🌿",
                body="If work feels frustrating or everyone seems annoying right now, blame the progesterone drop. Do 20 mins of easy work and wrap up."
            ))
            notifs.append(ScheduledNotification(
                trigger_time_slot="21:30_EVENING",
                notification_type="somatic_comfort",
                title="2 AM Overthinking Shield 🌙",
                body="Serotonin dips hardest at night before your period. Don't trust late-night brain spirals tonight—put the phone away early."
            ))

        # ---------------------------------------------------------
        # 5. MENSTRUAL PHASE
        # ---------------------------------------------------------
        elif phase == PhaseEstimate.MENSTRUAL:
            phase_title = f"Menstrual Phase (Day {cs.cycle_day})"
            phase_exp = (
                "Prostaglandins are active in the uterus while hormone levels are at their baseline reset. "
                "Your energy will naturally start rebounding around Day 3 or 4."
            )
            prod_forecast = (
                "Minimum Viable Effort Mode. Your body is doing heavy physical work behind the scenes—"
                "today is for coasting, administrative tasks, and rest."
            )
            suggestions = [
                "Cut your daily to-do list in half and do the easiest tasks sitting down.",
                "Use heat therapy (heating pad or warm shower) to relax uterine muscle contractions.",
                "Prioritize warm, easy-to-digest foods (khichdi, soup, ginger tea) and iron-rich snacks."
            ]
            receipt = "Logged! Zero guilt allowed today—your only job right now is staying comfortable."
            notifs.append(ScheduledNotification(
                trigger_time_slot="14:00_AFTERNOON",
                notification_type="somatic_comfort",
                title="Low-Expectations Afternoon ☕",
                body=f"Day {cs.cycle_day} reminder: Resting is maintenance, not laziness. Keep a warm drink or heating pad close and skip the heavy tasks."
            ))

        # ---------------------------------------------------------
        # 6. UNCERTAIN TRANSITION
        # ---------------------------------------------------------
        else:
            phase_title = f"Extended Cycle Window (Day {cs.cycle_day})"
            phase_exp = (
                "Your cycle is running a bit longer than your typical statistical window—often caused "
                "by a delayed follicular phase from stress, sleep changes, or travel."
            )
            prod_forecast = "Listen-to-Body Mode. Pace your work based on how rested you feel today."
            suggestions = [
                "Prioritize 7–8 hours of sleep tonight to help regulate cortisol and hormone signaling.",
                "Log any pre-period body cues or bleeding so the tracker can recalibrate instantly."
            ]
            receipt = "Logged! Cycles aren't trains—we've updated your state and will adjust as soon as Day 1 arrives."
            notifs.append(ScheduledNotification(
                trigger_time_slot="20:00_EVENING",
                notification_type="somatic_comfort",
                title="Evening Wind-Down 🌙",
                body="Give your nervous system extra sleep tonight while your cycle recalibrates."
            ))

        # Extra Specific Trigger: If she logged caffeine/sugar binge today, add a crash buffer notification
        if "gut_sugar" in selected_ids:
            notifs.append(ScheduledNotification(
                trigger_time_slot="17:00_AFTERNOON",
                notification_type="somatic_comfort",
                title="Sugar/Caffeine Crash Buffer 💧",
                body="Zero judgment on the caffeine & sugar today! Drink a big glass of water and grab a handful of nuts/chana now so you don't get a evening headache."
            ))

        return PhaseAndProductivitySuggestion(
            cycle_day=cs.cycle_day,
            phase_title=phase_title,
            phase_explanation=phase_exp,
            productivity_forecast=prod_forecast,
            actionable_suggestions=suggestions,
            reassurance_receipt=receipt,
            scheduled_notifications=notifs
        )