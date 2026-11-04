"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

/** Form bound to a server action; shows the action's error / success message. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={cn("space-y-4", className)}>
      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.ok}
        </p>
      )}
      {state?.setupCode && (
        <div role="status" className="rounded-lg border border-accent bg-accent-soft p-4 text-sm">
          <p className="font-semibold text-brand">Give these details to the person:</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-muted">Username</dt>
            <dd className="font-mono font-semibold">{state.setupCode.username}</dd>
            <dt className="text-muted">Setup code</dt>
            <dd className="font-mono text-lg font-bold tracking-widest">{state.setupCode.code}</dd>
          </dl>
          <p className="mt-2 text-xs text-muted">
            They go to the sign-in page, choose <strong>First time here? / Reset password</strong>, enter both and pick their own password.
            The code works once and expires in {state.setupCode.days} days. It won&apos;t be shown again — if it&apos;s lost, generate a new one.
          </p>
        </div>
      )}
      {children}
    </form>
  );
}

export function SubmitButton({ children, className = "btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Saving…" : children}
    </button>
  );
}

/** A one-button form that asks for confirmation before running a server action. */
export function ConfirmButton({
  action,
  message,
  children,
  className = "btn-danger",
}: {
  action: () => Promise<void>;
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      <SubmitButton className={className}>{children}</SubmitButton>
    </form>
  );
}
