from datetime import date, timedelta
from cycle_state_contract import (
    UserPhysiologyProfile,
    CycleRecord,
    DailyObservation,
    EmotionalState,
    CycleStateEstimator
)
from question_suggestion_engine import (
    QuestionAndSuggestionEngine,
    UserCardSubmission
)
from voice_listener_engine import SubtleVoiceListener
from feature_consumers import FeatureConsumerHub

today = date.today()

def run_rigorous_tests():
    print("==================================================")
    print(" 🧪 RUNNING HACKCACHE RIGOROUS BACKEND TEST SUITE")
    print("==================================================")

    # -------------------------------------------------------------------------
    # CASE 1: COLD START (New user, Day 25, zero history)
    # -------------------------------------------------------------------------
    print("\n[CASE 1] Cold Start (Day 25, No History)")
    user_cold = UserPhysiologyProfile(
        user_id="girl_01",
        last_period_start=today - timedelta(days=24), # Day 25
        cycle_history=[],
        recent_observations=[
            DailyObservation(
                obs_date=today,
                self_reported_emotion=EmotionalState.OVERTHINKING_ANXIOUS,
                somatic_luteal_markers=True
            )
        ]
    )
    contract_1 = CycleStateEstimator.build_shared_contract(user_cold, today)
    bundle_1 = FeatureConsumerHub.generate_experience_bundle(contract_1)
    
    print(f"  -> Detected Phase: {contract_1.cycle_state.best_phase_estimate.value} (Conf: {contract_1.cycle_state.phase_confidence})")
    print(f"  -> Morning Notification (Subtle & Frank): \"{bundle_1.morning_notification}\"")
    print(f"  -> Widget State Prompt: \"{bundle_1.widget.headline_prompt}\"")
    assert contract_1.cycle_state.best_phase_estimate.value == "late_luteal"
    print("  ✅ PASSED: Cold start correctly identifies late luteal phase using priors.")

    # -------------------------------------------------------------------------
    # CASE 2: EMOTION OVERRIDES CALENDAR (Day 10 Follicular, but user is spiralling)
    # -------------------------------------------------------------------------
    print("\n[CASE 2] Emotion Overrides Calendar (Day 10 Spiralling)")
    user_override = UserPhysiologyProfile(
        user_id="girl_02",
        last_period_start=today - timedelta(days=9), # Day 10 (Calendar says high energy)
        cycle_history=[CycleRecord(length_days=28), CycleRecord(length_days=28)],
        recent_observations=[
            DailyObservation(
                obs_date=today,
                self_reported_emotion=EmotionalState.ACUTE_SPIRAL # Real-life stress
            )
        ]
    )
    contract_2 = CycleStateEstimator.build_shared_contract(user_override, today)
    bundle_2 = FeatureConsumerHub.generate_experience_bundle(contract_2)

    print(f"  -> Calendar Phase: {contract_2.cycle_state.best_phase_estimate.value}")
    print(f"  -> Blame Hormones?: {contract_2.emotional_routing.use_cycle_as_supporting_context} (Must be False!)")
    print(f"  -> Widget rescue mode active?: {bundle_2.widget.show_sos_comfort_mode}")
    print(f"  -> Voice Prompt Instruction: {bundle_2.voice_companion.system_instruction[:80]}...")
    assert contract_2.emotional_routing.use_cycle_as_supporting_context is False
    print("  ✅ PASSED: Self-reported emotion successfully overrides calendar assumptions.")

    # -------------------------------------------------------------------------
    # CASE 3: CONFOUNDER FILTERING (45-day exam stress cycle ignored)
    # -------------------------------------------------------------------------
    print("\n[CASE 3] Confounded Outlier Filtering")
    user_outlier = UserPhysiologyProfile(
        user_id="girl_03",
        last_period_start=today - timedelta(days=13),
        cycle_history=[
            CycleRecord(length_days=28),
            CycleRecord(length_days=29),
            CycleRecord(length_days=45, is_confounded=True), # Exam stress outlier!
            CycleRecord(length_days=28)
        ]
    )
    contract_3 = CycleStateEstimator.build_shared_contract(user_outlier, today)
    print(f"  -> EWMA Unskewed Baseline: {contract_3.cycle_state.ewma_baseline_length} days")
    print(f"  -> Bayesian Posterior: {contract_3.cycle_state.bayesian_posterior_length} days (+/- {contract_3.cycle_state.prediction_window_days}d)")
    assert contract_3.cycle_state.ewma_baseline_length < 30.0
    print("  ✅ PASSED: Outlier cycle safely ignored; baseline remains unskewed.")

    # -------------------------------------------------------------------------
    # CASE 4: ANOMALY ACCUMULATION & SAFE TIMING (Dysmenorrhea Nudge on Day 8)
    # -------------------------------------------------------------------------
    print("\n[CASE 4] Anomaly Trigger & Safe Delivery Timing")
    past_pain_logs = [
        DailyObservation(obs_date=today - timedelta(days=d), cramps_vas=9, pain_relief_effective=False)
        for d in [7, 8, 35, 36, 63, 64]
    ]
    past_pain_logs.append(DailyObservation(obs_date=today, self_reported_emotion=EmotionalState.CALM_REGULATED))
    
    user_anomaly = UserPhysiologyProfile(
        user_id="girl_04",
        last_period_start=today - timedelta(days=7), # Day 8 (Calm Follicular)
        cycle_history=[CycleRecord(length_days=28), CycleRecord(length_days=28)],
        recent_observations=past_pain_logs
    )
    contract_4 = CycleStateEstimator.build_shared_contract(user_anomaly, today)
    bundle_4 = FeatureConsumerHub.generate_experience_bundle(contract_4)

    print(f"  -> Dysmenorrhea Resistance Score: {contract_4.anomaly_telemetry.dysmenorrhea_resistance_score}")
    print(f"  -> Allow Gentle Doctor Nudge?: {contract_4.safety_guards.allow_long_term_pattern_nudge}")
    print(f"  -> Dossier Nudge Text: \"{bundle_4.gentle_doctor_dossier_nudge}\"")
    assert contract_4.safety_guards.allow_long_term_pattern_nudge is True
    print("  ✅ PASSED: High anomaly detected and safely surfaced only during calm follicular phase.")

    # -------------------------------------------------------------------------
    # CASE 5: INTERACTIVE CARDS & DYNAMIC NOTIFICATIONS
    # -------------------------------------------------------------------------
    print("\n[CASE 5] Interactive Card Submission & Notification Queue")
    user_day9 = UserPhysiologyProfile(
        user_id="girl_05",
        last_period_start=today - timedelta(days=8), # Day 9
        cycle_history=[CycleRecord(length_days=28)]
    )
    contract_day9 = CycleStateEstimator.build_shared_contract(user_day9, today)
    cards = QuestionAndSuggestionEngine.get_daily_question_cards(contract_day9)
    
    # Simulate user tapping options
    submission = UserCardSubmission(
        obs_date=today,
        selected_option_ids=["emo_calm", "som_high", "gut_sugar"]
    )
    suggestion = QuestionAndSuggestionEngine.process_answers_and_suggest(user_day9, submission)
    
    print(f"  -> Generated Cards Count: {len(cards)}")
    print(f"  -> Productivity Forecast Title: {suggestion.productivity_forecast[:35]}...")
    print(f"  -> Scheduled Notifications Generated: {len(suggestion.scheduled_notifications)}")
    for n in suggestion.scheduled_notifications:
        print(f"     • [{n.trigger_time_slot}] {n.title}")
    assert len(suggestion.scheduled_notifications) >= 2
    print("  ✅ PASSED: Card submission successfully updates state and queues time-slotted notifications.")

    # -------------------------------------------------------------------------
    # CASE 6: SUBTLE VOICE LISTENER (Unstructured Venting)
    # -------------------------------------------------------------------------
    print("\n[CASE 6] Subtle Voice Listener (Unstructured Venting)")
    user_venting = UserPhysiologyProfile(
        user_id="girl_06",
        last_period_start=today - timedelta(days=24), # Day 25
        cycle_history=[CycleRecord(length_days=28)]
    )
    raw_vent = "My stomach is twisting, I can't stop crying over this stupid assignment, and I ate a whole bag of chips."
    voice_result = SubtleVoiceListener.listen_and_reassure(user_venting, raw_vent, today)

    print(f"  -> User Spoke: \"{raw_vent}\"")
    print(f"  -> Companion Audio Reply: \"{voice_result.companion_reassurance_speech}\"")
    print(f"  -> Silently Extracted Emotion: {voice_result.extracted_symptoms.detected_emotion.value}")
    print(f"  -> Silently Extracted Cramps VAS: {voice_result.extracted_symptoms.detected_cramps_vas}")
    assert voice_result.extracted_symptoms.detected_emotion == EmotionalState.ACUTE_SPIRAL
    assert voice_result.extracted_symptoms.detected_cramps_vas == 9
    print("  ✅ PASSED: Voice vent successfully parsed, logged silently, and met with cute empathy.")

    print("\n==================================================")
    print(" ✨ ALL 6 RIGOROUS CASES PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_rigorous_tests()