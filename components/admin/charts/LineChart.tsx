"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "../HelpTooltip";
import { format, startOfISOWeek, endOfISOWeek, setISOWeek, setISOWeekYear } from "date-fns";

interface LineChartProps {
  data: Array<{ date: string; [key: string]: string | number }>;
  title: string;
  description?: string;
  dataKey: string;
  color?: string;
  yAxisLabel?: string;
  className?: string;
  groupBy?: "day" | "week" | "month";
}

// Helper function to get date range for ISO week
function getWeekDateRange(isoWeekString: string): { start: Date; end: Date } | null {
  const match = isoWeekString.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  
  const [, year, week] = match;
  const yearNum = parseInt(year);
  const weekNum = parseInt(week);
  
  // Use a date in the target year and set it to the target ISO week
  // Start with Jan 1 of that year
  const baseDate = new Date(yearNum, 0, 1);
  
  // Set to the target ISO week year and week
  let weekDate = setISOWeekYear(baseDate, yearNum);
  weekDate = setISOWeek(weekDate, weekNum);
  
  // Get the start (Monday) and end (Sunday) of that ISO week
  const start = startOfISOWeek(weekDate);
  const end = endOfISOWeek(weekDate);
  
  return { start, end };
}

// Helper function to format date based on groupBy
function formatDateForDisplay(value: string, groupBy?: "day" | "week" | "month"): string {
  if (groupBy === "week") {
    // Format: "2024-W01" -> "Dec 14 - Dec 21"
    const weekRange = getWeekDateRange(value);
    if (weekRange) {
      const startStr = format(weekRange.start, "MMM d");
      const endStr = format(weekRange.end, "MMM d");
      return `${startStr} - ${endStr}`;
    }
    return value;
  }
  
  if (groupBy === "month") {
    // Format: "2024-01" -> "Jan 2024"
    const match = value.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const [, year, month] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    return value;
  }
  
  // Default: day format "yyyy-MM-dd"
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return value;
  }
}

// Helper function to format date for tooltip
function formatDateForTooltip(value: string, groupBy?: "day" | "week" | "month"): string {
  if (groupBy === "week") {
    // Format: "2024-W01" -> "Dec 14 - Dec 21, 2024"
    const weekRange = getWeekDateRange(value);
    if (weekRange) {
      const startStr = format(weekRange.start, "MMM d");
      const endStr = format(weekRange.end, "MMM d, yyyy");
      return `${startStr} - ${endStr}`;
    }
    return value;
  }
  
  if (groupBy === "month") {
    const match = value.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const [, year, month] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    return value;
  }
  
  // Default: day format
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export function LineChart({
  data,
  title,
  description,
  dataKey,
  color = "hsl(var(--chart-1))",
  yAxisLabel,
  className,
  groupBy = "day",
}: LineChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {description && <HelpTooltip content={description} />}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsLineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tickFormatter={(value) => formatDateForDisplay(value, groupBy)}
            />
            <YAxis className="text-xs" label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft" } : undefined} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
              labelFormatter={(value) => formatDateForTooltip(value, groupBy)}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}


