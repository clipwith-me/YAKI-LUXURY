"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Icon } from "@/components/ui/icons";
import { createAlertAction } from "@/app/actions/public";

/** “Notify me when a 4-bedroom under ₦200M appears in Lekki” — saves the current filters as an alert. */
export function SaveSearch({ query }: { query: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 text-sm text-stone-700 hover:text-ink">
        <Icon.Bell size={16} /> Create an alert for this search
      </button>
    );
  }
  return (
    <ActionForm action={createAlertAction} className="w-full max-w-md">
      {({ done }) =>
        done ? null : (
          <div className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="query" value={query} />
            <label className="flex-1 text-xs text-stone-600">Alert name<input name="name" required defaultValue="My search" className="mt-1 block h-10 w-full border border-stone-300 px-2 text-sm" /></label>
            <label className="text-xs text-stone-600">Frequency<select name="frequency" className="mt-1 block h-10 border border-stone-300 px-2 text-sm"><option value="INSTANT">As it happens</option><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option></select></label>
            <SubmitButton size="sm" className="h-10">Save alert</SubmitButton>
          </div>
        )
      }
    </ActionForm>
  );
}
