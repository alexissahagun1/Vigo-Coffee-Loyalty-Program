"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, CalendarDays } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

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

  const applyPreset = (preset: string) => {
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
        return;
    }

    onStartDateChange(format(start, "yyyy-MM-dd"));
    onEndDateChange(format(end, "yyyy-MM-dd"));
    setShowCustom(false);
  };

  return (
    <div className={`space-y-4 ${className || ""}`}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyPreset("last7")}
        >
          Last 7 Days
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyPreset("last30")}
        >
          Last 30 Days
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyPreset("thisMonth")}
        >
          This Month
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyPreset("lastMonth")}
        >
          Last Month
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyPreset("thisYear")}
        >
          This Year
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowCustom(!showCustom)}
        >
          <CalendarDays className="w-4 h-4 mr-2" />
          Custom Range
        </Button>
      </div>

      {showCustom && (
        <div className="flex items-end gap-4 p-4 border rounded-lg bg-background">
          <div className="flex-1">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}


