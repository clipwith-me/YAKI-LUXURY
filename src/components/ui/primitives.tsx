import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "brass" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-ivory hover:bg-ink-3",
  secondary: "bg-stone-100 text-ink hover:bg-stone-200",
  outline: "border border-ink/80 text-ink hover:bg-ink hover:text-ivory",
  ghost: "text-ink hover:bg-stone-100",
  brass: "bg-brass-500 text-white hover:bg-brass-600",
  danger: "bg-danger text-white hover:opacity-90",
  link: "text-ink underline-offset-4 hover:underline px-0",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-[13px] tracking-[0.14em] uppercase",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xs font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap",
    variants[variant],
    variant !== "link" && sizes[size],
    className,
  );
}

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}

type Tone = "neutral" | "brass" | "trust" | "danger" | "warning" | "ink" | "outline";
const tones: Record<Tone, string> = {
  neutral: "bg-stone-100 text-stone-700",
  brass: "bg-brass-50 text-brass-700",
  trust: "bg-trust-50 text-trust",
  danger: "bg-danger-50 text-danger",
  warning: "bg-warning-50 text-warning",
  ink: "bg-ink text-ivory",
  outline: "border border-stone-300 text-stone-700",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-[11px] font-medium tracking-wide", tones[tone], className)}>{children}</span>;
}

export function SectionHeading({ eyebrow, title, description, action, align = "left", className }: { eyebrow?: string; title: ReactNode; description?: ReactNode; action?: ReactNode; align?: "left" | "center"; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", align === "center" && "items-center text-center md:flex-col md:items-center", className)}>
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="text-3xl leading-[1.1] text-ink sm:text-[2.6rem]">{title}</h2>
        {description && <p className="mt-4 text-[15px] leading-7 text-stone-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-stone-300 bg-white/60 px-6 py-16 text-center">
      {icon && <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-500">{icon}</div>}
      <h3 className="text-2xl text-ink">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-6 text-stone-600">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "neutral", title, children, className }: { tone?: "neutral" | "warning" | "danger" | "trust" | "brass"; title?: string; children: ReactNode; className?: string }) {
  const styles = {
    neutral: "border-stone-200 bg-stone-50 text-stone-700",
    warning: "border-warning/30 bg-warning-50 text-warning",
    danger: "border-danger/30 bg-danger-50 text-danger",
    trust: "border-trust/30 bg-trust-50 text-trust",
    brass: "border-brass-300/60 bg-brass-50 text-brass-700",
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("border px-4 py-3 text-sm leading-6", styles, className)}>
      {title && <p className="font-medium">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("border border-stone-200 bg-white", className)}>{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="border border-stone-200 bg-white p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <p className="mt-2 font-display text-3xl text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xs bg-stone-200/70", className)} />;
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-stone-200", className)} />;
}
