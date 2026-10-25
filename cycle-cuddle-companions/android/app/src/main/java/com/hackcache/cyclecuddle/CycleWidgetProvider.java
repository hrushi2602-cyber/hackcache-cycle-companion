package com.hackcache.cyclecuddle;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * CycleWidgetProvider
 * Native Android Home Screen Card Deck Widget.
 *
 * Direct interactive bridge to the FastAPI backend:
 * - Fetches 2-3 daily questions from GET /api/deck/{user_id}
 * - Direct option taps on the home screen trigger POST /api/deck/{user_id}/answer
 *   to alter database state and dynamically recalibrate the core biometric model.
 * - Transitions to Phase Diet & Emotion suggestions.
 * - Empties into an aesthetic sanctuary featuring an uplifting quote and cute cartoon mascot graphic.
 */
public class CycleWidgetProvider extends AppWidgetProvider {

    private static final String TAG = "CycleWidgetDeck";

    // Intent Broadcast Actions
    public static final String ACTION_REFRESH = "com.hackcache.cyclecuddle.ACTION_REFRESH";
    public static final String ACTION_SELECT_OPTION = "com.hackcache.cyclecuddle.ACTION_SELECT_OPTION";
    public static final String ACTION_SKIP = "com.hackcache.cyclecuddle.ACTION_SKIP";
    public static final String ACTION_DISMISS_SUGGESTION = "com.hackcache.cyclecuddle.ACTION_DISMISS_SUGGESTION";
    public static final String ACTION_NEW_QUOTE = "com.hackcache.cyclecuddle.ACTION_NEW_QUOTE";
    public static final String ACTION_RETAKE = "com.hackcache.cyclecuddle.ACTION_RETAKE";

    public static final String EXTRA_OPTION_INDEX = "extra_option_index";

    // Deck Stages
    public static final int STAGE_QUESTION = 0;
    public static final int STAGE_SUGGESTION = 1;
    public static final int STAGE_EMPTY = 2;

    // SharedPreferences Persistence
    private static final String PREFS_NAME = "CycleWidgetPrefs";
    private static final String KEY_STAGE = "deck_stage";
    private static final String KEY_CARD_INDEX = "deck_card_index";
    private static final String KEY_DECK_JSON = "deck_cards_json";
    private static final String KEY_PHASE = "cached_phase";
    private static final String KEY_SUGGESTION_DIET = "cached_sugg_diet";
    private static final String KEY_SUGGESTION_EMOTION = "cached_sugg_emotion";
    private static final String KEY_QUOTE_INDEX = "deck_quote_index";
    private static final String KEY_STATUS_FEEDBACK = "deck_status_feedback";

    // FastAPI Backend Configuration
    private static final String BASE_URL = "http://192.168.1.16:8000";
    private static final String USER_ID = "test_user";

    // Curated Uplifting Quotes for Empty Deck Sanctuary
    private static final String[][] UPLIFTING_QUOTES = {
        {"\"Resting is not a reward you have to earn; it is the sacred soil from which your strength blooms.\"", "— Cycle Companion Note • Sanctuary"},
        {"\"Be gentle with your soft heart. Your body is orchestrating a biological masterpiece behind the scenes.\"", "— Body Wisdom • Hormonal Grace"},
        {"\"You do not have to force sunshine on days made for gentle rain and slow tea.\"", "— Daily Sanctuary • Inner Peace"},
        {"\"Your worth is never measured by your daily output. Honor the natural seasons of your mind.\"", "— Gentle Reminder • Mindful Pacing"},
        {"\"Breathe out the expectations of the world. In this quiet moment, simply being is more than enough.\"", "— Cozy Hug • Biometrics Calibrated ✨"}
    };

    // Default Fallback Deck JSON if network is unreachable on first run
    private static final String FALLBACK_DECK_JSON = "[" +
        "{\"card_id\":\"card_emotion\",\"category\":\"🌸 MIND & MOOD\",\"prompt\":\"Are we actually stressed about life today, or did hormones hijack the group chat in your head?\",\"options\":[" +
        "{\"option_id\":\"emo_calm\",\"label\":\"• Locked in & chill\"}," +
        "{\"option_id\":\"emo_anxious\",\"label\":\"• 20 tabs open / Overthinking\"}," +
        "{\"option_id\":\"emo_irritable\",\"label\":\"• Everyone is lowkey annoying\"}," +
        "{\"option_id\":\"emo_exhausted\",\"label\":\"• Zero battery / Zoned out\"}" +
        "]}," +
        "{\"card_id\":\"card_pain\",\"category\":\"🔥 BODY & COMFORT\",\"prompt\":\"How much is your body protesting right now?\",\"options\":[" +
        "{\"option_id\":\"pain_severe\",\"label\":\"• Send a heating pad immediately\"}," +
        "{\"option_id\":\"pain_mild\",\"label\":\"• Dull ache / backache, manageable\"}," +
        "{\"option_id\":\"pain_none\",\"label\":\"• No cramps today\"}" +
        "]}," +
        "{\"card_id\":\"card_cravings\",\"category\":\"☕ FUEL & CRAVINGS\",\"prompt\":\"What did the comfort-food monster demand today?\",\"options\":[" +
        "{\"option_id\":\"gut_sugar\",\"label\":\"• Survived on caffeine & sugar\"}," +
        "{\"option_id\":\"gut_hungry\",\"label\":\"• Extra hungry, ate everything\"}," +
        "{\"option_id\":\"gut_normal\",\"label\":\"• Kept meals fairly normal\"}" +
        "]}" +
        "]";

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        Log.d(TAG, "CycleWidget onEnabled - fetching live interactive deck");
        fetchDeckData(context);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Log.d(TAG, "CycleWidget onUpdate for " + appWidgetIds.length + " widgets");
        for (int appWidgetId : appWidgetIds) {
            updateWidgetUI(context, appWidgetManager, appWidgetId);
        }
        fetchDeckData(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        String action = intent != null ? intent.getAction() : null;
        Log.d(TAG, "CycleWidget onReceive action: " + action);

        if (ACTION_REFRESH.equals(action)) {
            fetchDeckData(context);
        } else if (ACTION_SELECT_OPTION.equals(action)) {
            int optionIndex = intent.getIntExtra(EXTRA_OPTION_INDEX, 0);
            handleOptionSelected(context, optionIndex);
        } else if (ACTION_SKIP.equals(action)) {
            handleSkip(context);
        } else if (ACTION_DISMISS_SUGGESTION.equals(action)) {
            handleDismissSuggestion(context);
        } else if (ACTION_NEW_QUOTE.equals(action)) {
            handleNewQuote(context);
        } else if (ACTION_RETAKE.equals(action)) {
            handleRetake(context);
        }
    }

    /**
     * Renders the complete widget UI depending on the active stage.
     */
    private static void updateWidgetUI(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.cycle_app_widget);
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

            int stage = prefs.getInt(KEY_STAGE, STAGE_QUESTION);
            int cardIndex = prefs.getInt(KEY_CARD_INDEX, 0);
            String phaseText = prefs.getString(KEY_PHASE, "Day 25 • Late Luteal");
            String deckJsonStr = prefs.getString(KEY_DECK_JSON, FALLBACK_DECK_JSON);

            JSONArray cards = new JSONArray(deckJsonStr);
            int totalCards = Math.max(1, cards.length());

            // 1. Header always shows cycle phase
            views.setTextViewText(R.id.widget_phase_text, phaseText);

            // Configure Root Click & Refresh
            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent openPendingIntent = PendingIntent.getActivity(
                context, 300, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_root, openPendingIntent);
            views.setOnClickPendingIntent(R.id.widget_btn_open, openPendingIntent);
            views.setOnClickPendingIntent(R.id.widget_btn_sugg_open, openPendingIntent);
            views.setOnClickPendingIntent(R.id.widget_btn_empty_open, openPendingIntent);

            Intent refreshIntent = new Intent(context, CycleWidgetProvider.class);
            refreshIntent.setAction(ACTION_REFRESH);
            PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(
                context, 301, refreshIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_btn_refresh, refreshPendingIntent);

            // =================================================================
            // STAGE 1: QUESTION CARDS DECK
            // =================================================================
            if (stage == STAGE_QUESTION) {
                views.setViewVisibility(R.id.widget_question_container, View.VISIBLE);
                views.setViewVisibility(R.id.widget_suggestion_container, View.GONE);
                views.setViewVisibility(R.id.widget_empty_container, View.GONE);

                views.setTextViewText(R.id.widget_step_text, "Card " + (cardIndex + 1) + " of " + totalCards);

                // Get Active Card
                int safeIndex = Math.min(cardIndex, totalCards - 1);
                JSONObject activeCard = cards.getJSONObject(safeIndex);

                String category = activeCard.optString("category", "🌸 MIND & MOOD").toUpperCase(Locale.ROOT);
                if (!category.contains("🌸") && !category.contains("🔥") && !category.contains("☕")) {
                    category = "🌸 " + category.replace("_", " ");
                }
                String prompt = activeCard.optString("prompt", "How are your energy and mind feeling today?");
                String statusFeedback = prefs.getString(KEY_STATUS_FEEDBACK, "Tap an answer to calibrate your cycle model:");

                views.setTextViewText(R.id.widget_category_tag, category);
                views.setTextViewText(R.id.widget_prompt_text, prompt);
                views.setTextViewText(R.id.widget_subtext, statusFeedback);

                // Populate Option Buttons (up to 5)
                JSONArray options = activeCard.optJSONArray("options");
                int optCount = options != null ? options.length() : 0;
                int[] optViewIds = {
                    R.id.widget_opt_1,
                    R.id.widget_opt_2,
                    R.id.widget_opt_3,
                    R.id.widget_opt_4,
                    R.id.widget_opt_5
                };

                for (int i = 0; i < optViewIds.length; i++) {
                    int viewId = optViewIds[i];
                    if (i < optCount) {
                        JSONObject opt = options.getJSONObject(i);
                        String label = opt.optString("label", "Option " + (i + 1));
                        if (!label.startsWith("• ")) {
                            label = "• " + label;
                        }
                        views.setViewVisibility(viewId, View.VISIBLE);
                        views.setTextViewText(viewId, label);

                        // Attach Option Click PendingIntent
                        Intent optIntent = new Intent(context, CycleWidgetProvider.class);
                        optIntent.setAction(ACTION_SELECT_OPTION);
                        optIntent.putExtra(EXTRA_OPTION_INDEX, i);
                        PendingIntent optPending = PendingIntent.getBroadcast(
                            context, 310 + i, optIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                        );
                        views.setOnClickPendingIntent(viewId, optPending);
                    } else {
                        views.setViewVisibility(viewId, View.GONE);
                    }
                }

                // Skip Card button
                Intent skipIntent = new Intent(context, CycleWidgetProvider.class);
                skipIntent.setAction(ACTION_SKIP);
                PendingIntent skipPending = PendingIntent.getBroadcast(
                    context, 320, skipIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                views.setOnClickPendingIntent(R.id.widget_btn_skip, skipPending);

            // =================================================================
            // STAGE 2: SUGGESTIONS DECK (DIET & EMOTION RECOMMENDATIONS)
            // =================================================================
            } else if (stage == STAGE_SUGGESTION) {
                views.setViewVisibility(R.id.widget_question_container, View.GONE);
                views.setViewVisibility(R.id.widget_suggestion_container, View.VISIBLE);
                views.setViewVisibility(R.id.widget_empty_container, View.GONE);

                views.setTextViewText(R.id.widget_step_text, "Deck Insights ✨");

                String diet = prefs.getString(KEY_SUGGESTION_DIET, "🍵 Warm chamomile or ginger tea relaxes pelvic muscle contractions.");
                String emotion = prefs.getString(KEY_SUGGESTION_EMOTION, "💖 Progesterone is shifting right on schedule. Give yourself zero guilt for taking it easy.");

                views.setTextViewText(R.id.widget_sugg_diet, diet);
                views.setTextViewText(R.id.widget_sugg_emotion, emotion);

                Intent dismissIntent = new Intent(context, CycleWidgetProvider.class);
                dismissIntent.setAction(ACTION_DISMISS_SUGGESTION);
                PendingIntent dismissPending = PendingIntent.getBroadcast(
                    context, 330, dismissIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                views.setOnClickPendingIntent(R.id.widget_btn_sugg_dismiss, dismissPending);

            // =================================================================
            // STAGE 3: EMPTY DECK SANCTUARY (CUTE MASCOT + UPLIFTING QUOTE)
            // =================================================================
            } else {
                views.setViewVisibility(R.id.widget_question_container, View.GONE);
                views.setViewVisibility(R.id.widget_suggestion_container, View.GONE);
                views.setViewVisibility(R.id.widget_empty_container, View.VISIBLE);

                views.setTextViewText(R.id.widget_step_text, "Deck Cleared ✨");

                int quoteIndex = prefs.getInt(KEY_QUOTE_INDEX, 0);
                String[] quotePair = UPLIFTING_QUOTES[quoteIndex % UPLIFTING_QUOTES.length];

                views.setTextViewText(R.id.widget_quote_text, quotePair[0]);
                views.setTextViewText(R.id.widget_quote_author, quotePair[1]);

                // Next Quote Button
                Intent newQuoteIntent = new Intent(context, CycleWidgetProvider.class);
                newQuoteIntent.setAction(ACTION_NEW_QUOTE);
                PendingIntent newQuotePending = PendingIntent.getBroadcast(
                    context, 340, newQuoteIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                views.setOnClickPendingIntent(R.id.widget_btn_new_quote, newQuotePending);

                // Retake Check-In Button
                Intent retakeIntent = new Intent(context, CycleWidgetProvider.class);
                retakeIntent.setAction(ACTION_RETAKE);
                PendingIntent retakePending = PendingIntent.getBroadcast(
                    context, 341, retakeIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                views.setOnClickPendingIntent(R.id.widget_btn_retake, retakePending);
            }

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception e) {
            Log.e(TAG, "Error in updateWidgetUI", e);
        }
    }

    private static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, CycleWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) {
            updateWidgetUI(context, manager, id);
        }
    }

    /**
     * Handles an option click from the home screen widget.
     * Submits answer to FastAPI backend POST /api/deck/{user_id}/answer and advances deck.
     */
    private static void handleOptionSelected(Context context, int optionIndex) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String deckJsonStr = prefs.getString(KEY_DECK_JSON, FALLBACK_DECK_JSON);
        int cardIndex = prefs.getInt(KEY_CARD_INDEX, 0);

        try {
            JSONArray cards = new JSONArray(deckJsonStr);
            if (cardIndex >= cards.length()) {
                // Deck finished -> suggestions
                prefs.edit().putInt(KEY_STAGE, STAGE_SUGGESTION).apply();
                updateAllWidgets(context);
                return;
            }

            JSONObject card = cards.getJSONObject(cardIndex);
            String cardId = card.optString("card_id", "card_" + cardIndex);
            JSONArray options = card.optJSONArray("options");

            String selectedOptionId = "opt_" + optionIndex;
            String optionLabel = "Option " + (optionIndex + 1);
            if (options != null && optionIndex < options.length()) {
                JSONObject optObj = options.getJSONObject(optionIndex);
                selectedOptionId = optObj.optString("option_id", selectedOptionId);
                optionLabel = optObj.optString("label", optionLabel);
            }

            // Provide immediate optimistic visual feedback on the widget
            prefs.edit().putString(KEY_STATUS_FEEDBACK, "✨ Selected: " + optionLabel + " • Syncing...").apply();
            updateAllWidgets(context);

            final String fCardId = cardId;
            final String fOptionId = selectedOptionId;
            final int fCardIndex = cardIndex;
            final int totalCards = cards.length();

            new Thread(() -> {
                try {
                    JSONObject payload = new JSONObject();
                    payload.put("card_id", fCardId);
                    JSONArray optArr = new JSONArray();
                    optArr.put(fOptionId);
                    payload.put("selected_option_ids", optArr);
                    payload.put("obs_date", new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()));

                    Log.d(TAG, "Submitting answer to FastAPI: " + payload);
                    String response = httpPost(BASE_URL + "/api/deck/" + USER_ID + "/answer", payload.toString());
                    Log.d(TAG, "Backend answer response: " + response);

                    String dietText = "🍵 Warm chamomile or ginger tea relaxes pelvic muscle contractions.";
                    String emotionText = "💖 Hormones are shifting on schedule. Give yourself gentle grace today.";
                    String updatedPhase = null;

                    if (response != null) {
                        JSONObject resObj = new JSONObject(response);
                        updatedPhase = resObj.optString("updated_phase", null);

                        JSONArray dietArr = resObj.optJSONArray("diet_suggestions");
                        if (dietArr != null && dietArr.length() > 0) {
                            StringBuilder sb = new StringBuilder();
                            for (int d = 0; d < dietArr.length(); d++) {
                                if (d > 0) sb.append("\n");
                                sb.append("• ").append(dietArr.getString(d));
                            }
                            dietText = sb.toString();
                        }

                        JSONArray emoArr = resObj.optJSONArray("emotion_suggestions");
                        if (emoArr != null && emoArr.length() > 0) {
                            StringBuilder sb = new StringBuilder();
                            for (int e = 0; e < emoArr.length(); e++) {
                                if (e > 0) sb.append("\n");
                                sb.append("• ").append(emoArr.getString(e));
                            }
                            emotionText = sb.toString();
                        } else {
                            String reassurance = resObj.optString("reassurance_receipt", "");
                            if (!reassurance.isEmpty()) {
                                emotionText = "🌸 " + reassurance;
                            }
                        }
                    }

                    int nextCardIndex = fCardIndex + 1;
                    int nextStage = (nextCardIndex >= totalCards) ? STAGE_SUGGESTION : STAGE_QUESTION;

                    SharedPreferences.Editor editor = prefs.edit();
                    editor.putInt(KEY_CARD_INDEX, nextCardIndex);
                    editor.putInt(KEY_STAGE, nextStage);
                    editor.putString(KEY_SUGGESTION_DIET, dietText);
                    editor.putString(KEY_SUGGESTION_EMOTION, emotionText);
                    editor.putString(KEY_STATUS_FEEDBACK, "Tap an answer to calibrate your cycle model:");
                    if (updatedPhase != null && !updatedPhase.isEmpty()) {
                        String cap = updatedPhase.substring(0, 1).toUpperCase(Locale.ROOT) + updatedPhase.substring(1).replace("_", " ");
                        editor.putString(KEY_PHASE, "Day 25 • " + cap);
                    }
                    editor.apply();

                    new Handler(Looper.getMainLooper()).post(() -> updateAllWidgets(context));
                } catch (Exception e) {
                    Log.e(TAG, "Error in handleOptionSelected network thread", e);
                    // Advance card even on network failure
                    int nextCardIndex = fCardIndex + 1;
                    int nextStage = (nextCardIndex >= totalCards) ? STAGE_SUGGESTION : STAGE_QUESTION;
                    prefs.edit()
                        .putInt(KEY_CARD_INDEX, nextCardIndex)
                        .putInt(KEY_STAGE, nextStage)
                        .putString(KEY_STATUS_FEEDBACK, "Tap an answer to calibrate your cycle model:")
                        .apply();
                    new Handler(Looper.getMainLooper()).post(() -> updateAllWidgets(context));
                }
            }).start();

        } catch (Exception e) {
            Log.e(TAG, "Error in handleOptionSelected", e);
        }
    }

    private static void handleSkip(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String deckJsonStr = prefs.getString(KEY_DECK_JSON, FALLBACK_DECK_JSON);
        int cardIndex = prefs.getInt(KEY_CARD_INDEX, 0);

        try {
            JSONArray cards = new JSONArray(deckJsonStr);
            int nextCardIndex = cardIndex + 1;
            int nextStage = (nextCardIndex >= cards.length()) ? STAGE_SUGGESTION : STAGE_QUESTION;

            prefs.edit()
                .putInt(KEY_CARD_INDEX, nextCardIndex)
                .putInt(KEY_STAGE, nextStage)
                .putString(KEY_STATUS_FEEDBACK, "Tap an answer to calibrate your cycle model:")
                .apply();

            updateAllWidgets(context);
        } catch (Exception e) {
            Log.e(TAG, "Error in handleSkip", e);
        }
    }

    private static void handleDismissSuggestion(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putInt(KEY_STAGE, STAGE_EMPTY).apply();
        updateAllWidgets(context);
    }

    private static void handleNewQuote(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        int currentQuote = prefs.getInt(KEY_QUOTE_INDEX, 0);
        prefs.edit().putInt(KEY_QUOTE_INDEX, (currentQuote + 1) % UPLIFTING_QUOTES.length).apply();
        updateAllWidgets(context);
    }

    private static void handleRetake(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putInt(KEY_STAGE, STAGE_QUESTION)
            .putInt(KEY_CARD_INDEX, 0)
            .putString(KEY_STATUS_FEEDBACK, "Tap an answer to calibrate your cycle model:")
            .apply();
        updateAllWidgets(context);
        fetchDeckData(context);
    }

    /**
     * Fetches live deck questions and cycle phase from FastAPI backend.
     */
    private static void fetchDeckData(Context context) {
        new Thread(() -> {
            try {
                Log.d(TAG, "Fetching live deck questions from " + BASE_URL + "/api/deck/" + USER_ID);
                String deckResponse = httpGet(BASE_URL + "/api/deck/" + USER_ID);

                String phaseFormatted = null;
                String cardsJson = null;

                if (deckResponse != null) {
                    JSONObject obj = new JSONObject(deckResponse);
                    int cycleDay = obj.optInt("cycle_day", 25);
                    String phaseName = obj.optString("evaluated_phase", "late_luteal").replace("_", " ");
                    String cap = phaseName.substring(0, 1).toUpperCase(Locale.ROOT) + phaseName.substring(1);
                    phaseFormatted = "Day " + cycleDay + " • " + cap;

                    JSONArray cards = obj.optJSONArray("cards");
                    if (cards != null && cards.length() > 0) {
                        cardsJson = cards.toString();
                    }
                }

                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();
                if (phaseFormatted != null) {
                    editor.putString(KEY_PHASE, phaseFormatted);
                }
                if (cardsJson != null) {
                    editor.putString(KEY_DECK_JSON, cardsJson);
                }
                editor.apply();

                new Handler(Looper.getMainLooper()).post(() -> updateAllWidgets(context));
            } catch (Exception e) {
                Log.e(TAG, "Error in fetchDeckData", e);
            }
        }).start();
    }

    private static String httpGet(String urlStr) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(6000);
            conn.setReadTimeout(6000);
            conn.setRequestProperty("Accept", "application/json");

            int code = conn.getResponseCode();
            if (code == 200) {
                BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    sb.append(line);
                }
                br.close();
                return sb.toString();
            } else {
                Log.w(TAG, "httpGet failed with HTTP " + code + " for " + urlStr);
            }
        } catch (Exception e) {
            Log.e(TAG, "httpGet exception for " + urlStr + ": " + e.getMessage());
        } finally {
            if (conn != null) conn.disconnect();
        }
        return null;
    }

    private static String httpPost(String urlStr, String jsonBody) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json");
            conn.setDoOutput(true);

            byte[] input = jsonBody.getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(input, 0, input.length);
            }

            int code = conn.getResponseCode();
            if (code >= 200 && code < 300) {
                BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    sb.append(line);
                }
                br.close();
                return sb.toString();
            } else {
                Log.w(TAG, "httpPost failed with HTTP " + code + " for " + urlStr);
            }
        } catch (Exception e) {
            Log.e(TAG, "httpPost exception for " + urlStr + ": " + e.getMessage());
        } finally {
            if (conn != null) conn.disconnect();
        }
        return null;
    }
}
