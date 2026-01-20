"use client";

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "../HelpTooltip";
import { format, startOfISOWeek, endOfISOWeek, setISOWeek, setISOWeekYear } from "date-fns";

interface AreaChartProps {
  data: Array<{ date: string; [key: string]: string | number }>;
  title: string;
  description?: string;
  dataKeys: Array<{ key: string; label: string; color?: string; format?: "number" | "currency" }>;
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

const formatTooltipValue = (value: number, format?: "number" | "currency") => {
  if (format === "currency") {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(value);
  }
  return new Intl.NumberFormat("es-MX").format(value);
};

export function AreaChart({
  data,
  title,
  description,
  dataKeys,
  yAxisLabel,
  className,
  groupBy = "day",
}: AreaChartProps) {
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  const getFormat = (labelOrKey: string) =>
    dataKeys.find((k) => k.key === labelOrKey || k.label === labelOrKey)?.format;

  return (
    <Card className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow border-border/80 ${className ?? ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {description && <HelpTooltip content={description} />}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsAreaChart
            data={data}
            margin={{ top: 8, right: 8, left: 4, bottom: 4 }}
            style={{ cursor: "default" }}
          >
            <defs>
              {dataKeys.map((dataKey, index) => (
                <linearGradient
                  key={dataKey.key}
                  id={`color${dataKey.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={dataKey.color || colors[index % colors.length]}
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor={dataKey.color || colors[index % colors.length]}
                    stopOpacity={0.05}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.6} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              tickFormatter={(value) => formatDateForDisplay(value, groupBy)}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft", style: { fontSize: 11 } } : undefined}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                padding: "10px 14px",
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 6 }}
              labelFormatter={(value) => formatDateForTooltip(value, groupBy)}
              formatter={(value, name) => [formatTooltipValue(Number(value ?? 0), getFormat(String(name ?? ""))), typeof name === "string" ? name : String(name ?? "")]}
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
            {dataKeys.map((dataKey, index) => (
              <Area
                key={dataKey.key}
                type="monotone"
                dataKey={dataKey.key}
                name={dataKey.label}
                stroke={dataKey.color || colors[index % colors.length]}
                strokeWidth={2}
                fill={`url(#color${dataKey.key})`}
                isAnimationActive
                animationDuration={600}
                animationEasing="ease-out"
              />
            ))}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}


