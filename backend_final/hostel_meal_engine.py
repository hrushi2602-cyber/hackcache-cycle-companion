from enum import Enum
from typing import List
from pydantic import BaseModel
from cycle_state_contract import PhaseEstimate

# ==========================================
# 1. HOSTEL CONSTRAINTS & SYMPTOMS
# ==========================================

class HostelAccess(Enum):
    MESS_ONLY = "mess_only"
    KETTLE_INDUCTION = "kettle_induction"
    TAPRI_CANTEEN = "tapri_canteen"

class MealSymptom(Enum):
    SUGAR_DIP = "sugar_dip"
    BLOATED = "bloated"
    LUTEAL_HUNGER = "luteal_hunger"
    CRAMPS = "cramps"

# ==========================================
# 2. INDIAN NUTRITION MATRIX MODELS
# ==========================================

class IndianHostelFood(BaseModel):
    name: str
    description: str
    access_required: List[HostelAccess]
    fixes_symptoms: List[MealSymptom]
    best_for_phases: List[PhaseEstimate]

class MealSuggestionReceipt(BaseModel):
    cozy_disclaimer: str
    symptom_addressed: str
    food_options: List[IndianHostelFood]

# ==========================================
# 3. THE FOOD DATABASE (ICMR-NIN Anchored)
# ==========================================

HOSTEL_FOOD_MATRIX = [
    IndianHostelFood(
        name="Curd Rice or Plain Khichdi",
        description="Cools the stomach and digests instantly. Perfect when heavy mess sabzi looks repulsive.",
        access_required=[HostelAccess.MESS_ONLY, HostelAccess.TAPRI_CANTEEN],
        fixes_symptoms=[MealSymptom.BLOATED],
        best_for_phases=[PhaseEstimate.MENSTRUAL, PhaseEstimate.LATE_LUTEAL]
    ),
    IndianHostelFood(
        name="Roasted Makhana or Peanut/Chana Mix",
        description="Packed with magnesium to calm uterine cramps and protein to shut down that infinite evening hunger.",
        access_required=[HostelAccess.TAPRI_CANTEEN],
        fixes_symptoms=[MealSymptom.LUTEAL_HUNGER, MealSymptom.CRAMPS],
        best_for_phases=[PhaseEstimate.EARLY_LUTEAL, PhaseEstimate.LATE_LUTEAL, PhaseEstimate.MENSTRUAL]
    ),
    IndianHostelFood(
        name="Mess Dal + Your Own Ghee",
        description="Hostel dal is mostly water, but adding a spoon of your own ghee provides healthy fats that instantly stabilize sugar crashes.",
        access_required=[HostelAccess.MESS_ONLY],
        fixes_symptoms=[MealSymptom.SUGAR_DIP, MealSymptom.LUTEAL_HUNGER],
        best_for_phases=[PhaseEstimate.EARLY_LUTEAL, PhaseEstimate.LATE_LUTEAL]
    ),
    IndianHostelFood(
        name="Ajwain or Jeera Water",
        description="Throw half a spoon in your room kettle to immediately settle period nausea and gas.",
        access_required=[HostelAccess.KETTLE_INDUCTION],
        fixes_symptoms=[MealSymptom.BLOATED, MealSymptom.CRAMPS],
        best_for_phases=[PhaseEstimate.MENSTRUAL, PhaseEstimate.LATE_LUTEAL]
    ),
    IndianHostelFood(
        name="Sattu Drink or Buttermilk (Chaas)",
        description="Complex carbs and probiotics. Stops the 4 PM brain fog without the sugar spike of an iced coffee.",
        access_required=[HostelAccess.TAPRI_CANTEEN],
        fixes_symptoms=[MealSymptom.SUGAR_DIP, MealSymptom.LUTEAL_HUNGER],
        best_for_phases=[PhaseEstimate.FOLLICULAR, PhaseEstimate.PERIOVULATORY_WINDOW]
    )
]

class HostelMealEngine:

    @staticmethod
    def _generate_cozy_disclaimer() -> str:
        return (
            "Just a quick note: Since hostel mess food is a complete mystery and we can't determine "
            "the exact composition of your canteen's sabzi, these are just gentle suggestions based on "
            "standard Indian nutrition principles (like ICMR guidelines) to help your body out today."
        )

    @classmethod
    def get_meal_suggestions(
        cls,
        current_phase: PhaseEstimate,
        symptom: MealSymptom,
        available_access: List[HostelAccess]
    ) -> MealSuggestionReceipt:
        
        suggested_foods = []
        
        for food in HOSTEL_FOOD_MATRIX:
            # 1. Does it fix her current problem?
            if symptom not in food.fixes_symptoms:
                continue
                
            # 2. Can she actually get it right now? (Intersection of available vs required access)
            if not any(access in available_access for access in food.access_required):
                continue
                
            # 3. Is it ideal for her current cycle phase? (Optional boost, but we filter loosely)
            if current_phase in food.best_for_phases:
                suggested_foods.append(food)
        
        # Fallback if no exact match is found
        if not suggested_foods:
            fallback = IndianHostelFood(
                name="Plain Water & Any Handful of Nuts",
                description="When nothing else works or is available, hydration and basic fats/protein will keep you stable.",
                access_required=[HostelAccess.MESS_ONLY],
                fixes_symptoms=[symptom],
                best_for_phases=[current_phase]
            )
            suggested_foods.append(fallback)

        # Map the symptom to a cute receipt header
        symptom_headers = {
            MealSymptom.SUGAR_DIP: "Crashing hard? Let's fix that blood sugar.",
            MealSymptom.BLOATED: "Stomach acting up? Let's keep it light and easy.",
            MealSymptom.LUTEAL_HUNGER: "Luteal monster mode activated! Let's get you some real fuel.",
            MealSymptom.CRAMPS: "Body protesting? Let's soothe those cramps from the inside."
        }

        return MealSuggestionReceipt(
            cozy_disclaimer=cls._generate_cozy_disclaimer(),
            symptom_addressed=symptom_headers.get(symptom, "Here is what you need right now."),
            food_options=suggested_foods
        )

if __name__ == "__main__":
    print("\n--- TEST: Hostel Meal Companion ---")
    
    receipt = HostelMealEngine.get_meal_suggestions(
        current_phase=PhaseEstimate.LATE_LUTEAL,
        symptom=MealSymptom.LUTEAL_HUNGER,
        available_access=[HostelAccess.MESS_ONLY, HostelAccess.TAPRI_CANTEEN]
    )
    
    print(f"\nDisclaimer: {receipt.cozy_disclaimer}")
    print(f"\nHeader: {receipt.symptom_addressed}")
    for option in receipt.food_options:
        print(f" • {option.name}: {option.description}")