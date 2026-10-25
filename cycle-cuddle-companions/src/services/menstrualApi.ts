import { resolveApiBase, API_TIMEOUT_MS } from "@/lib/api/config";

/**
 * Central API Service Layer for HackCache Menstrual Health Gateway
 * Strictly connects to live FastAPI backend configured by VITE_API_URL.
 */

export function getBaseUrl(): string {
  return resolveApiBase();
}

export const BASE_URL = getBaseUrl();
export const DEFAULT_USER_ID = "test_girl_01";

export function getActiveUserId(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    const saved = localStorage.getItem("hc_active_user_id");
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_USER_ID;
}

export function setActiveUserId(userId: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem("hc_active_user_id", userId.trim());
  }
}

// =============================================================================
// TYPED REQUEST & RESPONSE CONTRACTS (Exact parity with backend_final/main.py)
// =============================================================================

export interface UserProfilePayload {
  last_period_start: string; // ISO format: YYYY-MM-DD
  average_cycle_length: number;
  dietary_restrictions: string[];
}

export interface UserProfileResponse {
  status: string;
  message: string;
}

export interface CycleHeaderResponse {
  user_id: string;
  current_phase: string;
  cycle_day: number;
  estimated_next_bleed_date: string;
  prediction_window_days: number;
  phase_confidence: number;
  confidence_percentage: number;
  uncertainty_reason: string;
  evidence_source: string;
  typical_cycle_length: number;
}

export interface DynamicWidgetResponse {
  user_id: string;
  widget_type: "COMFORT" | "QUESTION" | "SUGGESTION" | string;
  display_text: string;
  evaluated_phase: string;
  evaluated_emotion: string;
  hours_since_last_log: number;
  is_time_decayed: boolean;
}

export interface PushNotification {
  notification_id: string;
  notification_type: string;
  trigger_timing: string;
  priority: "URGENT" | "HIGH" | "NORMAL" | "LOW" | string;
  title: string;
  body: string;
  action_url?: string;
}

export interface NotificationDispatchResponse {
  user_id: string;
  evaluated_phase: string;
  cramps_vas: number;
  immediate_alert_triggered: boolean;
  notifications: PushNotification[];
  clinical_pacing_note: string;
}

export interface RecommendedDish {
  name: string;
  description: string;
  access_required: string[];
  symptoms_addressed: string[];
  is_nausea_friendly: boolean;
}

export interface MealPlanResponse {
  user_id: string;
  current_phase: string;
  detected_symptoms: string[];
  conflicting_symptoms_present: boolean;
  dietary_adjustment_alert?: string | null;
  cozy_disclaimer: string;
  recommended_meals: RecommendedDish[];
  foods_to_avoid: string[];
}

export interface SymptomLogPayload {
  symptom_type: "period_start" | "cramps" | "anxiety" | "nausea" | "exhaustion" | string;
  severity: number;
  notes?: string | null;
}

export interface SymptomLogResponse {
  status: string;
  message: string;
  ui_action?: "REFRESH_WIDGET" | string;
}

export interface DailyDashboardResponse {
  user_id: string;
  current_phase: string;
  emotional_state: string;
  productivity_grace: string;
  sleep_protocol: string;
  diet_tips: string;
  check_in_questions: string[];
  symptoms_summary?: Record<string, unknown> | null;
}

export interface ChatPayload {
  message: string;
  tone?: string;
}

export interface ChatResponse {
  user_id: string;
  reply: string;
  detected_symptoms?: {
    detected_emotion?: string;
    detected_cramps_vas?: number;
    pain_relief_mentioned?: boolean | null;
    somatic_luteal_detected?: boolean;
    confounder_detected?: boolean;
    is_bleeding_detected?: boolean;
  };
  extracted_symptoms?: Record<string, unknown>;
  updated_phase?: string;
  silent_state_updated?: boolean;
  session_summary?: string;
  timestamp: string;
  ui_action: string;
}

export interface DeckQuestionOption {
  option_id: string;
  label: string;
  maps_to_emotion?: string | null;
  maps_to_cramps_vas?: number | null;
  maps_to_pain_relief_worked?: boolean | null;
  maps_to_somatic_luteal?: boolean | null;
  maps_to_confounder?: boolean | null;
  maps_to_is_bleeding?: boolean | null;
}

export interface DeckQuestionCard {
  card_id: string;
  category: string;
  prompt: string;
  options: DeckQuestionOption[];
}

export interface InteractiveDeckResponse {
  user_id: string;
  evaluated_phase: string;
  cycle_day: number;
  confidence_percentage: number;
  cards: DeckQuestionCard[];
}

export interface DeckAnswerPayload {
  selected_option_ids: string[];
  card_id?: string | undefined;
  obs_date?: string | undefined;
}

export interface DeckAnswerResult {
  status: string;
  message: string;
  ui_action?: string;
  updated_phase: string;
  phase_title: string;
  productivity_forecast: string;
  actionable_suggestions: string[];
  reassurance_receipt: string;
  diet_suggestions: string[];
  emotion_suggestions: string[];
}

export interface JournalSummaryResponse {
  strong_days_overview: string;
  weak_days_overview: string;
  pattern_insight: string;
}

// =============================================================================
// API ERROR CLASS
// =============================================================================

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// =============================================================================
// CORE HTTP CLIENT (45s timeout for AI reasoning engines)
// =============================================================================

async function request<T>(endpoint: string, options: RequestInit = {}, retries = 1): Promise<T> {
  const baseUrl = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;
  const controller = new AbortController();
  // 45 seconds timeout to accommodate free cloud tier cold starts and AI reasoning
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    if (!res.ok) {
      const errorMsg =
        (typeof body === "object" && body !== null && "detail" in body
          ? typeof (body as { detail: unknown }).detail === "string"
            ? (body as { detail: string }).detail
            : JSON.stringify((body as { detail: unknown }).detail)
          : null) ||
        (typeof body === "string" ? body : null) ||
        `Backend request failed with status ${res.status}`;

      throw new ApiError(res.status, errorMsg, body);
    }

    return body as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) {
      throw err;
    }

    // Auto-retry once on network drops or wake-up delays
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1500));
      return request<T>(endpoint, options, retries - 1);
    }

    if ((err as Error)?.name === "AbortError") {
      throw new ApiError(0, "The server took too long to respond. Free cloud servers may be waking up (can take ~30-50s)—please retry.");
    }
    throw new ApiError(
      0,
      `Waking up server... Could not connect to ${url}. If using free hosting, please allow ~30 seconds for initial startup.`,
    );
  }
}

// =============================================================================
// CENTRAL MENSTRUAL API CLIENT
// =============================================================================

export const MenstrualApi = {
  /**
   * 1. Onboarding: POST /api/user/{user_id}/profile
   * Payload: last_period_start, average_cycle_length, dietary_restrictions
   */
  async saveUserProfile(userId: string, payload: UserProfilePayload): Promise<UserProfileResponse> {
    return request<UserProfileResponse>(`/api/user/${encodeURIComponent(userId)}/profile`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * 2. Cycle Header: GET /api/cycle/{user_id}
   * Returns: current_phase, cycle_day, estimated_next_bleed_date, confidence
   */
  async getCycleHeader(userId: string): Promise<CycleHeaderResponse> {
    return request<CycleHeaderResponse>(`/api/cycle/${encodeURIComponent(userId)}`, {
      method: "GET",
    });
  },

  /**
   * 3. Dynamic Home Widget: GET /api/widget/{user_id}
   * Returns: widget_type ("COMFORT" | "QUESTION" | "SUGGESTION") and display_text
   */
  async getDynamicWidget(userId: string): Promise<DynamicWidgetResponse> {
    return request<DynamicWidgetResponse>(`/api/widget/${encodeURIComponent(userId)}`, {
      method: "GET",
    });
  },

  /**
   * 4. Notification Dispatcher: GET /api/notifications/{user_id}
   * Returns: scheduled and immediate alerts
   */
  async getNotifications(userId: string): Promise<NotificationDispatchResponse> {
    return request<NotificationDispatchResponse>(`/api/notifications/${encodeURIComponent(userId)}`, {
      method: "GET",
    });
  },

  /**
   * 5. Meal Planner: GET /api/meals/{user_id}
   * Returns: phase-specific hostel/canteen nutrition suggestions
   */
  async getMealPlan(userId: string): Promise<MealPlanResponse> {
    return request<MealPlanResponse>(`/api/meals/${encodeURIComponent(userId)}`, {
      method: "GET",
    });
  },

  /**
   * 6. Quick-Tap Symptom Bar: POST /api/log/{user_id}/symptoms
   * Payload: symptom_type, severity, notes
   */
  async logSymptom(userId: string, payload: SymptomLogPayload): Promise<SymptomLogResponse> {
    return request<SymptomLogResponse>(`/api/log/${encodeURIComponent(userId)}/symptoms`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * 7. Master Daily Cards: POST /api/dashboard/{user_id}
   * Returns: productivity_grace, sleep_protocol, diet_tips, check_in_questions
   * Sends explicit JSON body {} to avoid 422 Unprocessable Entity
   */
  async getDailyDashboard(userId: string): Promise<DailyDashboardResponse> {
    return request<DailyDashboardResponse>(`/api/dashboard/${encodeURIComponent(userId)}`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  /**
   * 8. Continuous Voice Vent: POST /api/chat/{user_id}
   * Payload: message, tone. Returns reply & updates silent health flags
   */
  async sendChatMessage(userId: string, payload: ChatPayload): Promise<ChatResponse> {
    return request<ChatResponse>(`/api/chat/${encodeURIComponent(userId)}`, {
      method: "POST",
      body: JSON.stringify({
        message: payload.message,
        tone: payload.tone ?? "reassuring, gentle, and empathetic",
      }),
    });
  },

  /**
   * 9. Separate Journal Tab: GET /api/journal/{user_id}/summary
   * Returns: strong_days_overview, weak_days_overview, pattern_insight
   */
  async getJournalSummary(userId: string): Promise<JournalSummaryResponse> {
    return request<JournalSummaryResponse>(`/api/journal/${encodeURIComponent(userId)}/summary`, {
      method: "GET",
    });
  },

  /**
   * 10. Interactive Card Deck: GET /api/deck/{user_id}
   * Returns: 2-3 daily check-in questions with interactive options
   */
  async getInteractiveDeck(userId: string): Promise<InteractiveDeckResponse> {
    return request<InteractiveDeckResponse>(`/api/deck/${encodeURIComponent(userId)}`, {
      method: "GET",
    });
  },

  /**
   * 11. Submit Interactive Card Deck Answer: POST /api/deck/{user_id}/answer
   * Updates core model state in database and returns actionable phase & diet suggestions
   */
  async submitDeckAnswer(userId: string, payload: DeckAnswerPayload): Promise<DeckAnswerResult> {
    return request<DeckAnswerResult>(`/api/deck/${encodeURIComponent(userId)}/answer`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
