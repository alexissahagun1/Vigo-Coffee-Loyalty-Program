"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

type PresetKey = "last7" | "last30" | "thisMonth" | "lastMonth" | "thisYear";

function getPresetRange(preset: PresetKey): { start: string; end: string } {
  const today = new Date();
  let start: Date;
  let end: Date = today;
  switch (preset) {
    case "last7":
      start = subDays(today, 7);
      break;
    case "last30":
      start = subDays(today, 30);
      break;
    case "thisMonth":
      start = startOfMonth(today);
      end = endOfMonth(today);
      break;
    case "lastMonth":
      const lastMonth = subDays(startOfMonth(today), 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
      break;
    case "thisYear":
      start = new Date(today.getFullYear(), 0, 1);
      break;
    default:
      return { start: "", end: "" };
  }
  return { start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd") };
}

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
}: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false);

  const activePreset = useMemo((): PresetKey | "custom" | null => {
    const keys: PresetKey[] = ["last7", "last30", "thisMonth", "lastMonth", "thisYear"];
    for (const k of keys) {
      const { start, end } = getPresetRange(k);
      if (start === startDate && end === endDate) return k;
    }
    return showCustom ? "custom" : null;
  }, [startDate, endDate, showCustom]);

  const applyPreset = (preset: PresetKey) => {
    const { start, end } = getPresetRange(preset);
    onStartDateChange(start);
    onEndDateChange(end);
    setShowCustom(false);
  };

  const presets: { key: PresetKey; label: string }[] = [
    { key: "last7", label: "7 days" },
    { key: "last30", label: "30 days" },
    { key: "thisMonth", label: "This month" },
    { key: "lastMonth", label: "Last month" },
    { key: "thisYear", label: "This year" },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap gap-2">
        {presets.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => applyPreset(key)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-full border transition-all",
              activePreset === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            )}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-full border transition-all",
            activePreset === "custom" || showCustom
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/80"
          )}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-end gap-4 p-4 rounded-xl border border-border/70 bg-muted/30">
          <div className="flex-1 min-w-[140px]">
            <Label htmlFor="start-date" className="text-xs font-medium text-muted-foreground">Start</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="mt-1.5 h-9"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <Label htmlFor="end-date" className="text-xs font-medium text-muted-foreground">End</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="mt-1.5 h-9"
            />
          </div>
        </div>
      )}
    </div>
  );
}


