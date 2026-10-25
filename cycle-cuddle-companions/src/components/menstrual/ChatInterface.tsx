import React, { useState, useRef, useEffect } from "react";
import { MenstrualApi, ChatResponse, ApiError, BASE_URL } from "@/services/menstrualApi";
import { Loader2, Send, Bot, User, AlertCircle, RefreshCw, Sparkles, Mic, MicOff, Volume2 } from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "companion";
  text: string;
  timestamp: string;
}

interface ChatInterfaceProps {
  userId: string;
  onWidgetSilentRefresh?: () => void;
}

// Window speech recognition typing
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  userId,
  onWidgetSilentRefresh,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [tone, setTone] = useState<string>("reassuring, gentle, and empathetic");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  // Web Speech API states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const win = typeof window !== "undefined" ? (window as IWindow) : null;
    const SpeechRec = win?.SpeechRecognition || win?.webkitSpeechRecognition;

    if (SpeechRec) {
      setSpeechSupported(true);
      try {
        const recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript) {
            setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
          setIsListening(false);
        };

        recognition.onerror = (err: any) => {
          console.warn("[Voice Recognition Notice]:", err);
          setIsListening(false);
          if (err.error === "not-allowed" || err.error === "service-not-allowed") {
            setMicNotice("Microphone access restricted on HTTP LAN. Please type your vent directly.");
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } catch (e) {
        console.warn("Speech recognition initialization caught:", e);
      }
    } else {
      setSpeechSupported(false);
    }
  }, []);

  const toggleListening = () => {
    setMicNotice(null);
    if (!speechSupported || !recognitionRef.current) {
      setMicNotice("Browser Speech API unavailable over HTTP LAN. Please type your vent below.");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Microphone start failed:", err);
        setIsListening(false);
        setMicNotice("Microphone blocked. Please type your message.");
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputMessage).trim();
    if (!text || loading) return;

    if (!textToSend) {
      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        sender: "user",
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputMessage("");
    }

    setLoading(true);
    setError(null);
    setLastFailedMessage(null);
    setMicNotice(null);

    try {
      const res: ChatResponse = await MenstrualApi.sendChatMessage(userId, {
        message: text,
        tone,
      });

      const companionMsg: ChatMessage = {
        id: `comp-${Date.now()}`,
        sender: "companion",
        text: res.reply,
        timestamp: res.timestamp
          ? new Date(res.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, companionMsg]);

      // Strict Rule: After each chat reply completes, immediately trigger the parent callback
      // to refresh DynamicHomeWidget (GET /api/widget/{user_id}) in case emotional state shifted
      if (onWidgetSilentRefresh) {
        onWidgetSilentRefresh();
      }
    } catch (err) {
      setLastFailedMessage(text);
      if (err instanceof ApiError) {
        setError(`Chat companion failed (${err.status}): ${err.message}`);
      } else {
        setError(`Network error: Could not reach voice vent backend at ${BASE_URL}.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  return (
    <div className="flex flex-col h-[580px] bg-card rounded-3xl border border-border shadow-soft overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              Continuous Empathetic Listener
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </h3>
            <p className="text-[11px] text-muted-foreground">Extracts biometrics & updates state in real time</p>
          </div>
        </div>

        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="text-xs bg-background border border-border rounded-xl px-2.5 py-1 text-foreground focus:outline-hidden"
        >
          <option value="reassuring, gentle, and empathetic">Gentle & Reassuring</option>
          <option value="validating and grounded">Validating & Grounded</option>
          <option value="upbeat and encouraging">Upbeat & Encouraging</option>
        </select>
      </div>

      {micNotice && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between">
          <span>{micNotice}</span>
          <button onClick={() => setMicNotice(null)} className="font-semibold underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
            <Bot className="w-10 h-10 mb-2 text-primary/40 animate-pulse" />
            <p className="text-sm font-medium text-foreground">How is your body feeling right now?</p>
            <p className="text-xs max-w-sm mt-1 text-muted-foreground leading-relaxed">
              Vent freely about cramps, nausea, brain fog, or exhaustion. Your companion listens empathetically and tracks your health markers.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.sender === "companion" && (
              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl p-3.5 text-sm ${
                m.sender === "user"
                  ? "bg-primary text-primary-foreground rounded-br-xs"
                  : "bg-muted text-foreground rounded-bl-xs border border-border/50"
              }`}
            >
              <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
              <span className="block text-[10px] mt-1 opacity-70 text-right">{m.timestamp}</span>
            </div>
            {m.sender === "user" && (
              <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs p-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Companion is listening & generating reflection via Gemini...</span>
          </div>
        )}
      </div>

      {/* Error alert with Retry */}
      {error && (
        <div className="px-4 py-2.5 bg-destructive/10 border-t border-destructive/20 text-destructive text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          {lastFailedMessage && (
            <button
              onClick={() => handleSendMessage(lastFailedMessage)}
              className="flex items-center gap-1 font-semibold underline hover:opacity-80 transition"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          )}
        </div>
      )}

      {/* Input Box with Voice & Text support */}
      <form onSubmit={onSubmit} className="p-3 border-t border-border bg-background flex items-center gap-2">
        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? "Stop listening" : "Tap to speak (Voice Vent)"}
          className={`p-2.5 rounded-xl border transition ${
            isListening
              ? "bg-rose-500 text-white border-rose-600 animate-pulse"
              : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={isListening ? "Listening... speak now" : "Vent how you're feeling (e.g. bad cramps, so tired)..."}
          disabled={loading}
          className="flex-1 text-sm bg-muted/40 border border-border rounded-xl px-3.5 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={loading || !inputMessage.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};
