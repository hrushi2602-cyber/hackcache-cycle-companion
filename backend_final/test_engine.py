from datetime import date, timedelta
from cycle_state_contract import (
    UserPhysiologyProfile,
    CycleRecord,
    DailyObservation,
    EmotionalState,
    CycleStateEstimator
)

today = date.today()

def run_scenarios():
    print("\n--- SCENARIO 1: Cold Start (Brand new user, Day 25, No history) ---")
    user_cold = UserPhysiologyProfile(
        user_id="u_01",
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
    print(f"Cycle Day: {contract_1.cycle_state.cycle_day}")
    print(f"Best Phase: {contract_1.cycle_state.best_phase_estimate.value} (Conf: {contract_1.cycle_state.phase_confidence})")
    print(f"Evidence: {contract_1.cycle_state.evidence_source.value}")
    print(f"Primary Emotion Driver: {contract_1.emotional_routing.primary_driver.value}")
    print(f"Use Cycle Context?: {contract_1.emotional_routing.use_cycle_as_supporting_context} -> {contract_1.emotional_routing.supporting_hormonal_context}")

    print("\n--- SCENARIO 2: Emotion Overrides Calendar (Day 10 Follicular, but User is Spiralling) ---")
    user_override = UserPhysiologyProfile(
        user_id="u_02",
        last_period_start=today - timedelta(days=9), # Day 10 (Should be high-energy Follicular)
        cycle_history=[CycleRecord(length_days=28), CycleRecord(length_days=29), CycleRecord(length_days=28)],
        recent_observations=[
            DailyObservation(
                obs_date=today,
                self_reported_emotion=EmotionalState.ACUTE_SPIRAL
            )
        ]
    )
    contract_2 = CycleStateEstimator.build_shared_contract(user_override, today)
    print(f"Best Phase: {contract_2.cycle_state.best_phase_estimate.value}")
    print(f"Primary Emotion Driver: {contract_2.emotional_routing.primary_driver.value}")
    print(f"Use Cycle Context?: {contract_2.emotional_routing.use_cycle_as_supporting_context} (Notice it is FALSE so we don't blame hormones on Day 10!)")
    print(f"Allow Long-Term Nudge?: {contract_2.safety_guards.allow_long_term_pattern_nudge} (Blocked because she is spiralling!)")

    print("\n--- SCENARIO 3: Confounded Outlier Filtering (45-day exam stress cycle ignored) ---")
    user_outlier = UserPhysiologyProfile(
        user_id="u_03",
        last_period_start=today - timedelta(days=13),
        cycle_history=[
            CycleRecord(length_days=28),
            CycleRecord(length_days=29),
            CycleRecord(length_days=45, is_confounded=True), # Exam month outlier!
            CycleRecord(length_days=28)
        ]
    )
    contract_3 = CycleStateEstimator.build_shared_contract(user_outlier, today)
    print(f"EWMA Baseline: {contract_3.cycle_state.ewma_baseline_length} days (Uneskewed by the 45-day month)")
    print(f"Bayesian Posterior: {contract_3.cycle_state.bayesian_posterior_length} days (+/- {contract_3.cycle_state.prediction_window_days}d)")

    print("\n--- SCENARIO 4: High Anomaly Triggered Safely in Calm Follicular Phase ---")
    # Simulate 6 days of severe painkiller-resistant cramps across past cycles, now on calm Day 8
    past_pain_logs = [
        DailyObservation(obs_date=today - timedelta(days=d), cramps_vas=9, pain_relief_effective=False)
        for d in [7, 8, 35, 36, 63, 64]
    ]
    past_pain_logs.append(DailyObservation(obs_date=today, self_reported_emotion=EmotionalState.CALM_REGULATED))
    
    user_anomaly = UserPhysiologyProfile(
        user_id="u_04",
        last_period_start=today - timedelta(days=7), # Day 8 (Calm Follicular)
        cycle_history=[CycleRecord(length_days=28), CycleRecord(length_days=28), CycleRecord(length_days=29)],
        recent_observations=past_pain_logs
    )
    contract_4 = CycleStateEstimator.build_shared_contract(user_anomaly, today)
    print(f"Cycle Day: {contract_4.cycle_state.cycle_day} ({contract_4.cycle_state.best_phase_estimate.value})")
    print(f"Dysmenorrhea Anomaly Score: {contract_4.anomaly_telemetry.dysmenorrhea_resistance_score}")
    print(f"Allow Gentle Doctor Nudge Today?: {contract_4.safety_guards.allow_long_term_pattern_nudge} (TRUE because she is calm & in Follicular phase!)")


    from question_suggestion_engine import QuestionAndSuggestionEngine, UserCardSubmission

    # Test 1: User on Day 9 (Follicular) taps "Locked in & chill" + "High energy"
    user_day9 = UserPhysiologyProfile(
        user_id="u_prod",
        last_period_start=today - timedelta(days=8),  # Day 9
        cycle_history=[CycleRecord(length_days=28), CycleRecord(length_days=29)]
    )

    # 1. Get the questions to show on screen
    contract_day9 = CycleStateEstimator.build_shared_contract(user_day9, today)
    questions = QuestionAndSuggestionEngine.get_daily_question_cards(contract_day9)
    print("\n--- QUESTIONS SHOWN TO USER ON DAY 9 ---")
    for q in questions:
        print(f"[{q.card_id}] {q.prompt}")
        print("   Options:", [o.label for o in q.options])

    # 2. Simulate User tapping options and getting the Phase & Productivity Suggestion
    submission = UserCardSubmission(
        obs_date=today,
        selected_option_ids=["emo_calm", "som_high", "gut_normal"]
    )
    suggestion = QuestionAndSuggestionEngine.process_answers_and_suggest(user_day9, submission)
    print("\n--- SUGGESTION RECEIPT RETURNED TO USER ---")
    print(suggestion.model_dump_json(indent=2))


    from voice_listener_engine import SubtleVoiceListener

    print("\n--- TEST: Subtle Voice Listener (Unstructured Voice Venting) ---")
    user_venting = UserPhysiologyProfile(
        user_id="u_voice",
        last_period_start=today - timedelta(days=24),  # Day 25 (Late Luteal)
        cycle_history=[CycleRecord(length_days=28)]
    )

    raw_voice_transcript = (
        "My stomach is twisting, I can't stop crying over this stupid assignment, "
        "and I just ate a whole bag of chips."
    )

    result = SubtleVoiceListener.listen_and_reassure(user_venting, raw_voice_transcript, today)
    print(f"User Said: \"{raw_voice_transcript}\"")
    print(f"\nCompanion Replied: \"{result.companion_reassurance_speech}\"")
    print(f"\nSilently Extracted: {result.extracted_symptoms.model_dump_json(indent=2)}")


    from feature_consumers import FeatureConsumerHub

    print("\n--- TEST: Feature Consumer Hub (Widget & Voice Bundles) ---")
    test_contract = CycleStateEstimator.build_shared_contract(user_cold, today)
    experience_bundle = FeatureConsumerHub.generate_experience_bundle(test_contract)
    print(experience_bundle.model_dump_json(indent=2))

if __name__ == "__main__":
    run_scenarios()


