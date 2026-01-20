"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "../HelpTooltip";

interface PieChartProps {
  data: Array<{ name: string; value: number; description?: string }>;
  title: string;
  description?: string;
  className?: string;
}

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function PieChart({
  data,
  title,
  description,
  className,
}: PieChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

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
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              isAnimationActive
              animationDuration={500}
              animationEasing="ease-out"
            >
              {data.map((_, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={PIE_COLORS[i % PIE_COLORS.length]}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                padding: "10px 14px",
              }}
              formatter={(value, name) => {
                const v = Number(value ?? 0);
                const pct = total > 0 ? ((v / total) * 100).toFixed(1) : "0";
                return [`${new Intl.NumberFormat("es-MX").format(v)} (${pct}%)`, name];
              }}
              cursor={false}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              iconType="circle"
              iconSize={10}
              formatter={(value) => {
                const item = data.find((d) => d.name === value);
                const v = item?.value ?? 0;
                const pct = total > 0 ? ((v / total) * 100).toFixed(0) : "0";
                return `${value} · ${pct}%`;
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
