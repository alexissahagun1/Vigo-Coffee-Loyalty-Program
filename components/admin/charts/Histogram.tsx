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
          <RechartsBarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="range"
              className="text-xs"
              label={{ value: xAxisLabel, position: "insideBottom", offset: -5 }}
            />
            <YAxis
              className="text-xs"
              label={{ value: yAxisLabel, angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Bar dataKey="count" fill="hsl(var(--chart-1))" />
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}


