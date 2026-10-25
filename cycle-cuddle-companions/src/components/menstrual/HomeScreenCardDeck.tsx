import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MenstrualApi,
  DeckQuestionCard,
  DeckAnswerResult,
  ApiError,
} from "@/services/menstrualApi";
import {
  Sparkles,
  Heart,
  Utensils,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  Smile,
  Zap,
  Flame,
  Moon,
  Coffee,
  Brain,
  Quote,
  X,
  Layers,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

interface HomeScreenCardDeckProps {
  userId: string;
  onStateUpdated?: () => Promise<void> | void;
  className?: string;
}

// Fallback question cards in case network is disconnected
const FALLBACK_DECK_CARDS: DeckQuestionCard[] = [
  {
    card_id: "card_emotion",
    category: "Mind & Mood",
    prompt: "Are we actually stressed about life today, or did hormones hijack the group chat in your head?",
    options: [
      { option_id: "emo_calm", label: "Locked in & chill", maps_to_emotion: "calm_regulated" },
      { option_id: "emo_anxious", label: "20 tabs open / Overthinking", maps_to_emotion: "overthinking_anxious" },
      { option_id: "emo_irritable", label: "Everyone is lowkey annoying", maps_to_emotion: "irritable_frustrated" },
      { option_id: "emo_exhausted", label: "Zero battery / Zoned out", maps_to_emotion: "exhausted_low" },
      { option_id: "emo_spiral", label: "Full-on spiralling today", maps_to_emotion: "acute_spiral" },
    ],
  },
  {
    card_id: "card_pain",
    category: "Body & Comfort",
    prompt: "How much is your body protesting right now?",
    options: [
      { option_id: "pain_severe", label: "Send a heating pad immediately", maps_to_cramps_vas: 8 },
      { option_id: "pain_mild", label: "Dull ache / backache, manageable", maps_to_cramps_vas: 4 },
      { option_id: "pain_none", label: "No cramps today", maps_to_cramps_vas: 0 },
    ],
  },
  {
    card_id: "card_cravings",
    category: "Fuel & Cravings",
    prompt: "What did the comfort-food monster demand today?",
    options: [
      { option_id: "gut_sugar", label: "Survived on caffeine & sugar" },
      { option_id: "gut_hungry", label: "Extra hungry, ate everything" },
      { option_id: "gut_normal", label: "Kept meals fairly normal" },
    ],
  },
];

// Curated uplifting quotes for empty deck state
const UPLIFTING_QUOTES = [
  {
    quote: "Resting is not a reward you have to earn; it is the sacred soil from which your strength blooms.",
    author: "Cycle Companion Note",
    tag: "Self-Compassion",
  },
  {
    quote: "Be gentle with your soft heart. Your body is orchestrating a biological masterpiece behind the scenes.",
    author: "Body Wisdom",
    tag: "Hormonal Grace",
  },
  {
    quote: "You do not have to force sunshine on days made for gentle rain and slow tea.",
    author: "Daily Sanctuary",
    tag: "Inner Peace",
  },
  {
    quote: "Your worth is never measured by your daily output. Honor the natural seasons of your mind.",
    author: "Gentle Reminder",
    tag: "Mindful Pacing",
  },
  {
    quote: "Breathe out the expectations of the world. In this quiet moment, simply being is more than enough.",
    author: "Cozy Hug",
    tag: "Sanctuary",
  },
];

export const HomeScreenCardDeck: React.FC<HomeScreenCardDeckProps> = ({
  userId,
  onStateUpdated,
  className = "",
}) => {
  const [deckCards, setDeckCards] = useState<DeckQuestionCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Suggestions state (Diet & Emotion)
  const [suggestionData, setSuggestionData] = useState<DeckAnswerResult | null>(null);
  const [dismissedDiet, setDismissedDiet] = useState<boolean>(false);
  const [dismissedEmotion, setDismissedEmotion] = useState<boolean>(false);

  // Quote rotation
  const [quoteIndex, setQuoteIndex] = useState<number>(0);

  // Touch Swipe Gesture State (Mobile / Capacitor)
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Local storage cache keys
  const storageKey = `cycle_cuddle_deck_${userId}_${new Date().toISOString().slice(0, 10)}`;

  // 1. Fetch deck questions from backend
  const loadDeck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Check if user already finished deck today in local storage
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.completed) {
            setDeckCards(parsed.cards || FALLBACK_DECK_CARDS);
            setCurrentCardIndex(parsed.cards?.length || 3);
            if (parsed.suggestions) {
              setSuggestionData(parsed.suggestions);
            }
            setDismissedDiet(parsed.dismissedDiet ?? true);
            setDismissedEmotion(parsed.dismissedEmotion ?? true);
            setLoading(false);
            return;
          }
        } catch {
          // ignore corrupted local storage
        }
      }

      const res = await MenstrualApi.getInteractiveDeck(userId);
      if (res && res.cards && res.cards.length > 0) {
        setDeckCards(res.cards);
      } else {
        setDeckCards(FALLBACK_DECK_CARDS);
      }
    } catch (err) {
      console.warn("[HomeScreenCardDeck] Backend deck fetch failed, using fallback bank:", err);
      setDeckCards(FALLBACK_DECK_CARDS);
      if (err instanceof ApiError && err.status >= 500) {
        setError(`Gateway Notice: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, storageKey]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  // 2. Handle Option Selection & Submit to Backend
  const handleSelectOption = async (optionId: string) => {
    if (isSubmitting) return;
    setSelectedOptionId(optionId);
    setIsSubmitting(true);

    const activeCard = deckCards[currentCardIndex];
    const isLastQuestion = currentCardIndex >= deckCards.length - 1;

    try {
      // Directly alter state in database and recalibrate core model
      const result = await MenstrualApi.submitDeckAnswer(userId, {
        selected_option_ids: [optionId],
        card_id: activeCard?.card_id,
        obs_date: new Date().toISOString().slice(0, 10),
      });

      if (result) {
        setSuggestionData(result);
      }

      // Notify parent to refresh CycleHeader, Widget, and Notifications
      if (onStateUpdated) {
        await onStateUpdated();
      }

      // Advance to next card with slight delay for visual feedback
      setTimeout(() => {
        const nextIndex = currentCardIndex + 1;
        setCurrentCardIndex(nextIndex);
        setSelectedOptionId(null);
        setIsSubmitting(false);

        // Save progress to local storage
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            completed: nextIndex >= deckCards.length,
            cards: deckCards,
            suggestions: result,
            dismissedDiet: false,
            dismissedEmotion: false,
          })
        );
      }, 260);
    } catch (err) {
      console.error("[HomeScreenCardDeck] Answer submission error:", err);
      // Fallback advance even on network error so the user isn't stuck
      setTimeout(() => {
        const nextIndex = currentCardIndex + 1;
        setCurrentCardIndex(nextIndex);
        setSelectedOptionId(null);
        setIsSubmitting(false);
      }, 260);
    }
  };

  // 3. Touch Gesture Handlers (for native swipe feel in Capacitor)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setDragStartX(touch.clientX);
    setDragCurrentX(touch.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartX === null) return;
    const touch = e.touches[0];
    if (!touch) return;
    setDragCurrentX(touch.clientX);
  };

  const handleTouchEnd = () => {
    if (dragStartX !== null && dragCurrentX !== null) {
      const deltaX = dragCurrentX - dragStartX;
      // If user swipes right/left over 90px on a suggestion, dismiss it
      if (Math.abs(deltaX) > 90) {
        if (!hasFinishedQuestions) {
          // Swipe to skip question
          setCurrentCardIndex((prev) => Math.min(prev + 1, deckCards.length));
        } else if (!dismissedDiet) {
          handleDismissDiet();
        } else if (!dismissedEmotion) {
          handleDismissEmotion();
        }
      }
    }
    setDragStartX(null);
    setDragCurrentX(null);
  };

  const handleDismissDiet = () => {
    setDismissedDiet(true);
    updateStoredDismissals(true, dismissedEmotion);
  };

  const handleDismissEmotion = () => {
    setDismissedEmotion(true);
    updateStoredDismissals(dismissedDiet, true);
  };

  const updateStoredDismissals = (diet: boolean, emotion: boolean) => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.dismissedDiet = diet;
        parsed.dismissedEmotion = emotion;
        localStorage.setItem(storageKey, JSON.stringify(parsed));
      }
    } catch {
      // ignore
    }
  };

  const handleResetDeck = () => {
    localStorage.removeItem(storageKey);
    setCurrentCardIndex(0);
    setSelectedOptionId(null);
    setDismissedDiet(false);
    setDismissedEmotion(false);
    setSuggestionData(null);
    loadDeck();
  };

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % UPLIFTING_QUOTES.length);
  };

  const totalQuestions = deckCards.length || 3;
  const hasFinishedQuestions = currentCardIndex >= totalQuestions;
  const hasPendingSuggestions =
    hasFinishedQuestions && (!dismissedDiet || !dismissedEmotion);
  const isDeckCompletelyEmpty =
    hasFinishedQuestions && dismissedDiet && dismissedEmotion;

  // Swipe offset style
  const swipeDelta =
    dragStartX !== null && dragCurrentX !== null ? dragCurrentX - dragStartX : 0;
  const dragRotation = swipeDelta * 0.04;
  const dragStyle =
    dragStartX !== null
      ? {
          transform: `translateX(${swipeDelta}px) rotate(${dragRotation}deg)`,
          transition: "none",
        }
      : {
          transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease",
        };

  if (loading) {
    return (
      <div className={`p-6 rounded-3xl border border-pink-200/50 dark:border-pink-900/40 bg-card/60 backdrop-blur-md shadow-sm ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-100/70 dark:bg-pink-950/60 flex items-center justify-center animate-pulse">
            <Sparkles className="w-5 h-5 text-pink-500 animate-spin" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-44 bg-muted/60 rounded-full animate-pulse" />
            <div className="h-3 w-64 bg-muted/40 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STAGE 3: EMPTY DECK STATE (THE AESTHETIC FINALE)
  // ---------------------------------------------------------------------------
  if (isDeckCompletelyEmpty) {
    const currentQuote = UPLIFTING_QUOTES[quoteIndex] || UPLIFTING_QUOTES[0]!;

    return (
      <section
        className={`relative overflow-hidden rounded-3xl border border-pink-200/70 dark:border-pink-900/40 bg-gradient-to-br from-rose-50/90 via-pink-50/60 to-purple-50/70 dark:from-rose-950/20 dark:via-pink-950/15 dark:to-purple-950/20 p-6 sm:p-7 shadow-md transition-all duration-300 ${className}`}
      >
        {/* Soft background glow accents */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-300/25 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-300/25 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          {/* Cartoonistic Cute Mascot Graphic */}
          <div className="flex-shrink-0 relative group">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1.5 bg-white/80 dark:bg-card/80 shadow-md border border-pink-200/60 dark:border-pink-800/40 relative overflow-hidden transition-transform duration-300 hover:scale-105 active:scale-95">
              <img
                src="/assets/mascot_cozy.jpg"
                alt="Cozy Cycle Mascot"
                className="w-full h-full object-cover rounded-2xl select-none pointer-events-none"
                onError={(e) => {
                  // Fallback cute SVG if image file is not found
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              {/* Cute floating sparkle badge */}
              <div className="absolute -top-1 -right-1 bg-amber-400 text-white rounded-full p-1 shadow-sm animate-bounce">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Uplifting Quote & Aesthetic Content */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-pink-500/15 text-pink-700 dark:text-pink-300 border border-pink-300/40">
                Deck Cleared • Daily Peace ✨
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300">
                {currentQuote.tag}
              </span>
            </div>

            <div className="relative mt-2">
              <Quote className="w-5 h-5 text-pink-400/40 inline-block -mt-2 mr-1 rotate-180" />
              <p className="text-sm sm:text-base font-medium text-foreground/90 leading-relaxed italic inline">
                {currentQuote.quote}
              </p>
            </div>

            <p className="text-xs text-muted-foreground mt-2 font-medium">
              — {currentQuote.author}
            </p>

            {/* Interactive Actions for the Deck */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-4 pt-3 border-t border-pink-200/40 dark:border-pink-900/40">
              <button
                onClick={handleNextQuote}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-card/80 hover:bg-white text-foreground text-xs font-semibold shadow-xs border border-pink-200/60 dark:border-pink-800/50 transition active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                New Quote
              </button>

              <button
                onClick={handleResetDeck}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-700 dark:text-pink-300 text-xs font-semibold transition active:scale-95"
              >
                <RefreshCw className="w-3 h-3 text-pink-500" />
                Retake Check-In
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------------------------
  // STAGE 2: PHASE SUGGESTIONS (DIET & EMOTION CARDS)
  // ---------------------------------------------------------------------------
  if (hasPendingSuggestions) {
    const isShowingDiet = !dismissedDiet;

    return (
      <section className={`relative rounded-3xl p-6 sm:p-7 border shadow-md transition-all duration-300 ${className} ${
        isShowingDiet
          ? "border-emerald-200/70 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-green-50/80 dark:from-emerald-950/20 dark:via-teal-950/15 dark:to-green-950/20"
          : "border-purple-200/70 dark:border-purple-900/40 bg-gradient-to-br from-purple-50/90 via-indigo-50/50 to-pink-50/80 dark:from-purple-950/20 dark:via-indigo-950/15 dark:to-pink-950/20"
      }`}>
        <div
          ref={cardRef}
          style={dragStyle}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative z-10"
        >
          {isShowingDiet ? (
            <div>
              {/* Diet Suggestion Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-xs">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40">
                        Phase Nutrition & Fuel
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        Suggestion 1 of 2
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mt-0.5">
                      Tailored to Your Phase & Check-In
                    </h3>
                  </div>
                </div>

                <button
                  onClick={handleDismissDiet}
                  className="p-1.5 rounded-xl hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition"
                  title="Dismiss suggestion"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Diet Tips List */}
              <div className="mt-4 space-y-2 bg-white/70 dark:bg-card/70 rounded-2xl p-4 border border-emerald-200/50 dark:border-emerald-800/40">
                {suggestionData?.diet_suggestions && suggestionData.diet_suggestions.length > 0 ? (
                  suggestionData.diet_suggestions.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
                      <span className="text-emerald-500 font-bold mt-0.5">•</span>
                      <span>{tip}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    Hydrate generously with warm ginger or peppermint tea, and favor complex, easily digestible carbohydrates to soften metabolic swings.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-[11px] text-muted-foreground">
                  Swipe or tap to proceed
                </span>
                <button
                  onClick={handleDismissDiet}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition active:scale-95"
                >
                  Got It ✨ Next
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Emotion Suggestion Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 shadow-xs">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300/40">
                        Emotional Grounding & Pacing
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        Suggestion 2 of 2
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mt-0.5">
                      Biological Compassion Guardrail
                    </h3>
                  </div>
                </div>

                <button
                  onClick={handleDismissEmotion}
                  className="p-1.5 rounded-xl hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 transition"
                  title="Dismiss suggestion"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Emotion Tips List */}
              <div className="mt-4 space-y-2 bg-white/70 dark:bg-card/70 rounded-2xl p-4 border border-purple-200/50 dark:border-purple-800/40">
                {suggestionData?.emotion_suggestions && suggestionData.emotion_suggestions.length > 0 ? (
                  suggestionData.emotion_suggestions.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
                      <span className="text-purple-500 font-bold mt-0.5">•</span>
                      <span>{tip}</span>
                    </div>
                  ))
                ) : suggestionData?.reassurance_receipt ? (
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed italic">
                    "{suggestionData.reassurance_receipt}"
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    Hormones are fluctuating right now. Postpone heavy emotional confrontation, take tasks in 20-minute chunks, and allow yourself guilt-free downtime.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-[11px] text-muted-foreground">
                  Swipe or tap to complete deck
                </span>
                <button
                  onClick={handleDismissEmotion}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition active:scale-95"
                >
                  Love This 💖 Clear Deck
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------------------------
  // STAGE 1: QUESTION CARDS (2-3 QUESTIONS IN A STACK)
  // ---------------------------------------------------------------------------
  const activeCard = deckCards[currentCardIndex];
  const nextCard = deckCards[currentCardIndex + 1];
  const thirdCard = deckCards[currentCardIndex + 2];

  const getCategoryIcon = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes("mood") || lower.includes("mind") || lower.includes("emotion")) {
      return <Brain className="w-4 h-4 text-violet-500" />;
    }
    if (lower.includes("pain") || lower.includes("body") || lower.includes("comfort")) {
      return <Flame className="w-4 h-4 text-rose-500" />;
    }
    return <Coffee className="w-4 h-4 text-amber-500" />;
  };

  return (
    <section className={`relative pt-2 pb-1 ${className}`}>
      {/* Visual 3D Stack Effect: Card 3 peek */}
      {thirdCard && (
        <div className="absolute inset-x-4 top-4 h-36 rounded-3xl bg-card/40 border border-border/30 shadow-xs transform scale-[0.92] translate-y-4 pointer-events-none -z-20 transition-all duration-300" />
      )}

      {/* Visual 3D Stack Effect: Card 2 peek */}
      {nextCard && (
        <div className="absolute inset-x-2 top-2 h-40 rounded-3xl bg-card/70 border border-border/50 shadow-sm transform scale-[0.96] translate-y-2 pointer-events-none -z-10 transition-all duration-300" />
      )}

      {/* Active Top Card */}
      {activeCard && (
        <div
          ref={cardRef}
          style={dragStyle}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative z-10 overflow-hidden rounded-3xl border border-pink-200/80 dark:border-pink-900/50 bg-gradient-to-br from-card via-card/95 to-pink-50/20 dark:to-pink-950/10 p-5 sm:p-6 shadow-md backdrop-blur-md transition-all duration-300"
        >
          {/* Card Top Header & Progress Indicator */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-pink-500/10 dark:bg-pink-500/20">
                {getCategoryIcon(activeCard.category)}
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-pink-500/15 text-pink-700 dark:text-pink-300 border border-pink-300/40">
                {activeCard.category}
              </span>
            </div>

            {/* Step Counter */}
            <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-full">
              <span className="text-[11px] font-semibold text-foreground">
                Card {currentCardIndex + 1}
              </span>
              <span className="text-[10px] text-muted-foreground">of {totalQuestions}</span>
            </div>
          </div>

          {/* Question Prompt */}
          <div className="mt-3.5 mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-foreground leading-snug">
              {activeCard.prompt}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1">
              Tap your answer to adjust the biometric model & recommendations
            </p>
          </div>

          {/* Interactive Option Buttons */}
          <div className="space-y-2">
            {activeCard.options.map((option) => {
              const isSelected = selectedOptionId === option.option_id;

              return (
                <button
                  key={option.option_id}
                  disabled={isSubmitting}
                  onClick={() => handleSelectOption(option.option_id)}
                  className={`w-full min-h-[46px] p-3 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-between gap-3 active:scale-[0.98] ${
                    isSelected
                      ? "bg-pink-500 text-white border-pink-600 shadow-sm"
                      : "bg-background/80 hover:bg-pink-50/60 dark:hover:bg-pink-950/30 border-border/70 hover:border-pink-300 dark:hover:border-pink-800 text-foreground"
                  }`}
                >
                  <span className="flex-1 leading-snug">{option.label}</span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${
                      isSelected
                        ? "bg-white text-pink-600 border-white"
                        : "border-muted-foreground/30 text-transparent"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Progress dots footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              {deckCards.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentCardIndex
                      ? "w-6 bg-pink-500"
                      : i < currentCardIndex
                      ? "w-2 bg-pink-300 dark:bg-pink-800"
                      : "w-2 bg-muted"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => setCurrentCardIndex((prev) => Math.min(prev + 1, deckCards.length))}
              className="hover:text-foreground transition flex items-center gap-1"
            >
              Skip
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
