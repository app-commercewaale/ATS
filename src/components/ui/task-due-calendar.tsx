"use client";

import * as React from "react";
import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  format,
  isSameDay,
  nextFriday,
  nextMonday,
  startOfToday,
} from "date-fns";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";

interface Preset {
  label: string;
  getDate: () => Date;
}

const PRESETS: Preset[] = [
  { label: "Today", getDate: () => startOfToday() },
  { label: "Tomorrow", getDate: () => addDays(startOfToday(), 1) },
  { label: "This Fri", getDate: () => nextFriday(startOfToday()) },
  { label: "Next Mon", getDate: () => nextMonday(startOfToday()) },
  { label: "+1 week", getDate: () => addWeeks(startOfToday(), 1) },
];

function relativeLabel(date: Date) {
  const diff = differenceInCalendarDays(date, startOfToday());
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 1) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

interface TaskDueCalendarProps {
  selected?: Date;
  onSelect: (date: Date) => void;
  disablePast?: boolean;
}

export function TaskDueCalendar({
  selected,
  onSelect,
  disablePast = true,
}: TaskDueCalendarProps) {
  const today = startOfToday();

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap gap-1.5 border-b p-2">
        {PRESETS.map((p) => {
          const date = p.getDate();
          const active = selected && isSameDay(selected, date);
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onSelect(date)}
              className={cn(
                "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-transparent bg-muted/50 hover:bg-muted text-foreground"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <Calendar
        mode="single"
        selected={selected}
        onSelect={(d) => d && onSelect(d)}
        disabled={disablePast ? (date) => date < today : undefined}
        modifiers={{
          weekend: (date) => {
            const day = date.getDay();
            return day === 0 || day === 6;
          },
        }}
        modifiersClassNames={{
          weekend: "text-muted-foreground/70",
        }}
        initialFocus
      />

      <div className="flex items-center justify-between border-t px-3 py-2 text-[11px]">
        {selected ? (
          <>
            <span className="font-medium text-foreground">
              {format(selected, "EEE, MMM d, yyyy")}
            </span>
            <span className="text-muted-foreground">
              {relativeLabel(selected)}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">No date selected</span>
        )}
      </div>
    </div>
  );
}
