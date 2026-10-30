"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/server/errors";
import { buttonClasses } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

export type FormAction = (prev: ActionResult<unknown> | null, form: FormData) => Promise<ActionResult<unknown>>;

/**
 * Progressive-enhancement form around a server action. Renders success/error messages accessibly,
 * passes field errors to children, and optionally resets on success.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  successMessage,
}: {
  action: FormAction;
  children: (state: { fieldErrors: Record<string, string[] | undefined>; pending: boolean; done: boolean }) => ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  successMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  const fieldErrors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form ref={ref} action={formAction} className={className} noValidate>
      {children({ fieldErrors, pending, done: Boolean(state?.ok) })}
      <div aria-live="polite" className="mt-3 empty:hidden">
        {state && !state.ok && (
          <p role="alert" className="border border-danger/30 bg-danger-50 px-3 py-2 text-sm text-danger">
            {state.error}
            {state.requestId && <span className="block text-xs opacity-70">Reference: {state.requestId.slice(0, 8)}</span>}
          </p>
        )}
        {state?.ok && (state.message || successMessage) && <p className="border border-trust/30 bg-trust-50 px-3 py-2 text-sm text-trust">{state.message ?? successMessage}</p>}
      </div>
    </form>
  );
}

export function SubmitButton({ children, variant = "primary", size = "md", className, pendingLabel = "Please wait…", name, value }: { children: ReactNode; variant?: Parameters<typeof buttonClasses>[0]; size?: Parameters<typeof buttonClasses>[1]; className?: string; pendingLabel?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  // Multi-button forms (approve / reject, submit / draft) need to know which button was used.
  // Mirror the button's name/value into a hidden field so it reaches the server action reliably.
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const form = e.currentTarget.form;
    if (!form || !name) return;
    let field = form.querySelector<HTMLInputElement>(`input[type="hidden"][data-submitter="${name}"]`);
    if (!field) {
      field = document.createElement("input");
      field.type = "hidden";
      field.name = name;
      field.dataset.submitter = name;
      form.appendChild(field);
    }
    field.value = value ?? "";
  };
  return (
    <button type="submit" name={name} value={value} onClick={onClick} disabled={pending} aria-busy={pending} className={cn(buttonClasses(variant, size), className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/** For server-rendered pages: a server action + static JSX children, with result messaging. */
export function SimpleActionForm({ action, children, className, resetOnSuccess }: { action: FormAction; children: ReactNode; className?: string; resetOnSuccess?: boolean }) {
  return (
    <ActionForm action={action} className={className} resetOnSuccess={resetOnSuccess}>
      {() => children}
    </ActionForm>
  );
}
