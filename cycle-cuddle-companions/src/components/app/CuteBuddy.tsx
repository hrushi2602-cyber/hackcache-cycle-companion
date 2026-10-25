import { useEffect, useRef, useState } from "react";
import { Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BuddyKind = "bunny" | "cat" | "bear" | "cloud";
export type BuddyMood = "happy" | "sleepy" | "comforting" | "concerned" | "curious" | "listening" | "celebrating";
type Reaction = { mood: BuddyMood; message: string; pose: string; id: number };
const CHEERS = ["One tiny step is enough today.", "You deserve kindness, just as you are.", "You don't have to do everything at once.", "I'm in your corner, at your pace."];
const TAPS: Omit<Reaction, "id">[] = [
  { mood: "happy", pose: "wave", message: "A little hello from BunBun!" },
  { mood: "curious", pose: "wiggle", message: "Oh, hello! Keeping you company." },
  { mood: "happy", pose: "hop", message: "A tiny hop, just for you." },
  { mood: "comforting", pose: "blush", message: "A little warmth for your day." },
];
const MESSAGES: Record<BuddyMood, string> = {
  happy: "Hi, I'm BunBun. I'm happy to see you.", sleepy: "It's okay to take a softer pace.",
  comforting: "A gentle hug. No need to have all the answers.", concerned: "Whatever you're feeling, there's room for it here.",
  curious: "Hello there. How is your day feeling?", listening: "I'm here. Take your time.", celebrating: "A little moment of care, just for you!",
};

/** One shared pet; reactions are local and never change health data. `kind` is retained for existing callers. */
export function CuteBuddy({
  mood = "happy", size = 96, bounce = false, sparkle = false, label, className,
  message, interactive = false, controls = false, celebrationKey = 0,
}: {
  kind?: BuddyKind; mood?: BuddyMood; size?: number; bounce?: boolean; sparkle?: boolean;
  label?: string; className?: string; message?: string; interactive?: boolean; controls?: boolean; celebrationKey?: number;
}) {
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const sequence = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setReaction(null);
    if (timer.current) clearTimeout(timer.current);
  }, [mood, message, celebrationKey]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const react = (next: Omit<Reaction, "id">) => {
    if (timer.current) clearTimeout(timer.current);
    setReaction({ ...next, id: ++sequence.current });
    timer.current = setTimeout(() => setReaction(null), 3200);
  };
  const current = reaction?.mood ?? mood;
  const text = reaction?.message ?? message ?? MESSAGES[current];
  const joyful = current === "happy" || current === "celebrating";
  const hugging = current === "comforting";
  const sleepy = current === "sleepy";
  const art = (
    <span key={`${current}-${reaction?.id ?? celebrationKey}-${bounce}`} className={cn("bunbun-art", (bounce || current === "celebrating") && "bunbun-hop", reaction && `bunbun-${reaction.pose}`)}>
      <svg viewBox="0 0 140 160" aria-hidden="true" className="bunbun-svg overflow-visible">
        <ellipse cx="70" cy="148" rx="32" ry="5" className="fill-lavender/25" />
        <g className={cn("bunbun-body", `bunbun-${current}`)}>
          <ellipse cx="105" cy="122" rx="12" ry="12" className="fill-card stroke-peach" strokeWidth="2" />
          <ellipse cx="70" cy="119" rx="32" ry="28" className="fill-card stroke-peach" strokeWidth="2" />
          <ellipse cx="70" cy="125" rx="20" ry="17" className="fill-blush/45" />
          <ellipse cx="51" cy="145" rx="14" ry="7" className="fill-card stroke-peach" strokeWidth="2" />
          <ellipse cx="89" cy="145" rx="14" ry="7" className="fill-card stroke-peach" strokeWidth="2" />
          <g className="bunbun-head">
            <g className="bunbun-ear bunbun-ear-left"><ellipse cx="48" cy="37" rx="12" ry="31" className="fill-card stroke-peach" strokeWidth="2" /><ellipse cx="48" cy="36" rx="6" ry="22" className="fill-blush" /></g>
            <g className="bunbun-ear bunbun-ear-right"><ellipse cx="91" cy="37" rx="12" ry="31" className="fill-card stroke-peach" strokeWidth="2" /><ellipse cx="91" cy="36" rx="6" ry="22" className="fill-blush" /></g>
            <path d="M32 77 Q29 50 55 51 Q70 45 85 51 Q111 50 108 77 Q114 103 91 110 Q70 118 49 110 Q26 103 32 77Z" className="fill-card stroke-peach" strokeWidth="2" />
            <g className="stroke-foreground" strokeWidth="2.6" strokeLinecap="round" fill="none">
              <g className={sleepy ? "" : "bunbun-eyes"}>
                {sleepy ? <path d="M49 79 q5 5 10 0 M81 79 q5 5 10 0" /> : joyful ? <path d="M49 80 q5-8 10 0 M81 80 q5-8 10 0" /> : <><ellipse cx="54" cy="79" rx="3.3" ry={current === "curious" ? 5 : 4} className="fill-foreground" stroke="none" /><ellipse cx="86" cy="79" rx="3.3" ry="4" className="fill-foreground" stroke="none" /></>}
              </g>
              {current === "concerned" && <path d="M49 69 l9-2 M91 69 l-9-2" />}
              <path d="M67 87 q3-3 6 0 l-3 3Z" className="fill-peach stroke-peach" />
              <path d={current === "concerned" ? "M64 98 q6-3 12 0" : joyful ? "M62 94 q8 10 16 0" : "M64 95 q6 4 12 0"} />
            </g>
            <ellipse cx="41" cy="90" rx="8" ry="5" className="bunbun-cheek fill-blush" /><ellipse cx="99" cy="90" rx="8" ry="5" className="bunbun-cheek fill-blush" />
          </g>
          <g className="bunbun-paw bunbun-paw-left"><ellipse cx={hugging ? 60 : 39} cy={hugging ? 119 : 116} rx="9" ry="13" className="fill-card stroke-peach" strokeWidth="2" /></g>
          <g className="bunbun-paw bunbun-paw-right"><ellipse cx={hugging ? 80 : 101} cy={hugging ? 119 : 116} rx="9" ry="13" className="fill-card stroke-peach" strokeWidth="2" /></g>
          {hugging && <path d="M70 117 c-9-11-20 1-12 8 l12 10 12-10 c8-7-3-19-12-8Z" className="fill-blush stroke-primary" strokeWidth="1.5" />}
        </g>
        {sleepy && <g className="bunbun-zzz fill-accent-foreground font-sans" fontSize="12"><text x="111" y="53">z</text><text x="120" y="38">Z</text></g>}
        {(sparkle || current === "celebrating" || reaction?.pose === "hop") && <g className="bunbun-confetti fill-primary"><path d="M18 52 l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" /><path d="M116 90 c-6-8-13 0-8 5 l8 7 8-7 c5-5-2-13-8-5Z" /><path d="M112 17 l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" className="fill-lavender" /></g>}
      </svg>
    </span>
  );
  return (
    <div className={cn("bunbun inline-flex max-w-full flex-col items-center gap-2", className)} data-buddy-mood={current}>
      <div className="flex max-w-full items-center gap-3">
        {interactive ? <Button type="button" variant="ghost" aria-label="Pet BunBun" title="Pet BunBun" onClick={() => react(TAPS[Math.floor(Math.random() * TAPS.length)] ?? TAPS[0] ?? { mood: "happy", pose: "hop", message: MESSAGES.happy })} className="bunbun-touch h-auto shrink-0 rounded-full p-1" style={{ width: size, height: size * 1.14 }}>{art}</Button> : <span className="bunbun-touch shrink-0" style={{ width: size, height: size * 1.14 }} role={label ? "img" : undefined} aria-label={label ? `BunBun: ${label}` : undefined} aria-hidden={label ? undefined : true}>{art}</span>}
        {(message || interactive) && <p role="status" className="bunbun-speech min-w-0 rounded-2xl rounded-bl-sm border border-blush bg-card/90 px-3 py-2 text-sm leading-relaxed text-foreground shadow-soft">{text}</p>}
      </div>
      {controls && <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" className="min-h-11 rounded-full border-blush bg-blush/50 px-3 text-xs" onClick={() => react({ mood: "comforting", pose: "hug", message: "A gentle BunBun hug. You can just be here." })}><Heart aria-hidden /> Give BunBun a hug</Button>
        <Button type="button" variant="secondary" className="min-h-11 rounded-full px-3 text-xs" onClick={() => react({ mood: "happy", pose: "hop", message: CHEERS[Math.floor(Math.random() * CHEERS.length)] ?? MESSAGES.happy })}><Sparkles aria-hidden /> Cheer me up</Button>
      </div>}
    </div>
  );
}