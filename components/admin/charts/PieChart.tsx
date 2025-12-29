"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "../HelpTooltip";

interface PieChartProps {
  data: Array<{ name: string; value: number; description?: string }>;
  title: string;
  description?: string;
  className?: string;
}

const COLORS = [
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
  // Filter out zero values and calculate total
  const filteredData = data.filter((item) => item.value > 0);
  const total = filteredData.reduce((sum, item) => sum + item.value, 0);

  // If no data, show empty state
  if (filteredData.length === 0) {
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
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

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
          <RechartsPieChart>
            <Pie
              data={filteredData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              innerRadius={filteredData.length > 3 ? 40 : 0} // Donut chart if many segments
              fill="#8884d8"
              dataKey="value"
              paddingAngle={filteredData.length > 1 ? 2 : 0} // Add spacing between segments
            >
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
              formatter={(value: number | undefined, name: string, props: any) => {
                const item = filteredData.find((d) => d.name === name);
                const numValue = value ?? 0;
                const percentage = total > 0 ? ((numValue / total) * 100).toFixed(1) : "0";
                return [
                  `${numValue} (${percentage}%)`,
                  item?.description || name,
                ];
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value: string) => {
                const item = filteredData.find((d) => d.name === value);
                const percentage = item && total > 0 
                  ? ((item.value / total) * 100).toFixed(1) 
                  : "0";
                return `${value} (${percentage}%)`;
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

