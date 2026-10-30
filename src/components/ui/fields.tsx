import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "block w-full rounded-xs border border-stone-300 bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-stone-400 transition-colors focus:border-ink focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-danger";

export function Field({ label, htmlFor, error, hint, required, children, className }: { label: string; htmlFor: string; error?: string[] | string; hint?: ReactNode; required?: boolean; children: ReactNode; className?: string }) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-stone-700">
        {label}
        {required && <span className="text-brass-600"> *</span>}
      </label>
      {children}
      {message ? (
        <p id={`${htmlFor}-error`} className="text-xs text-danger">
          {message}
        </p>
      ) : hint ? (
        <p className="text-xs text-stone-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, invalid, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} aria-describedby={invalid && props.id ? `${props.id}-error` : undefined} className={cn(control, className)} {...props} />;
}

export function Textarea({ className, invalid, ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return <textarea aria-invalid={invalid || undefined} className={cn(control, "min-h-28", className)} {...props} />;
}

export function Select({ className, invalid, children, ...props }: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select aria-invalid={invalid || undefined} className={cn(control, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23645d52%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_0.9rem_center] bg-no-repeat pr-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ label, className, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-stone-700", className)}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#0f1113]" {...props} />
      <span>{label}</span>
    </label>
  );
}
