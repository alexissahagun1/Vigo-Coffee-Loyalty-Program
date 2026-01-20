"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "../HelpTooltip";

interface HistogramProps {
  data: Array<{ range: string; count: number }>;
  title: string;
  description?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  className?: string;
}

export function Histogram({
  data,
  title,
  description,
  xAxisLabel = "Range",
  yAxisLabel = "Count",
  className,
}: HistogramProps) {
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
          <RechartsBarChart
            data={data}
            margin={{ top: 8, right: 8, left: 4, bottom: 4 }}
            style={{ cursor: "default" }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.6} vertical={false} />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -4, style: { fontSize: 11 } } : undefined}
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
              formatter={(value) => [new Intl.NumberFormat("es-MX").format(Number(value ?? 0)), "Gift cards"]}
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}
            />
            <Bar
              dataKey="count"
              fill="hsl(var(--chart-1))"
              radius={[6, 6, 0, 0]}
              maxBarSize={56}
              isAnimationActive
              animationDuration={500}
              animationEasing="ease-out"
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}


