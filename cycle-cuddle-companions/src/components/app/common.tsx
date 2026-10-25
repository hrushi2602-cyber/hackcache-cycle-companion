import type { ReactNode } from "react";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CuteBuddy } from "@/components/app/CuteBuddy";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-semibold md:text-4xl">{title}<Sparkles aria-hidden className="h-5 w-5 text-primary" /></h1>
        {subtitle && <p className="mt-2 max-w-xl text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-3xl border border-border/60 bg-card p-5 shadow-soft md:p-6", className)}>{children}</section>;
}

export function DemoLabel(_props: { children?: ReactNode }) {
  return null;
}

export function SymptomTag({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blush px-3 py-1 text-sm text-blush-foreground shadow-soft">
      {label}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="rounded-full p-0.5 hover:bg-background">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {label}
    </div>
  );
}

export function ErrorState({ message = "We couldn't reach the server.", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
      {onRetry && <button type="button" onClick={onRetry} className="ml-2 font-medium underline">Try again</button>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground"><CuteBuddy kind="bunny" mood="comforting" size={48} /><p>{children}</p></div>;
}

export function FieldError({ id, message }: { id: string; message?: string | null | undefined }) {
  if (!message) return null;
  return <p id={id} className="mt-1 text-sm text-destructive">{message}</p>;
}

export function CharCount({ value, max }: { value: string; max: number }) {
  return <span className={cn("text-xs", value.trim().length > max ? "text-destructive" : "text-muted-foreground")}>{value.trim().length}/{max}</span>;
}

export const formatDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
