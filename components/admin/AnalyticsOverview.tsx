"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { LineChart } from "./charts/LineChart";
import { AreaChart } from "./charts/AreaChart";
import { BarChart } from "./charts/BarChart";
import { PieChart } from "./charts/PieChart";
import { Histogram } from "./charts/Histogram";
import { DateRangePicker } from "./DateRangePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Minus, Download, AlertTriangle } from "lucide-react";
import { HelpTooltip } from "./HelpTooltip";

// API fetch functions
async function fetchTransactions(startDate: string, endDate: string, groupBy: string) {
  const res = await fetch(
    `/api/admin/analytics/transactions?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`
  );
  if (!res.ok) throw new Error("Failed to fetch transactions");
  const data = await res.json();
  return data.data || [];
}

async function fetchCustomerGrowth(startDate: string, endDate: string, groupBy: string) {
  const res = await fetch(
    `/api/admin/analytics/customer-growth?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`
  );
  if (!res.ok) throw new Error("Failed to fetch customer growth");
  const data = await res.json();
  return data.data || [];
}

async function fetchRedemptions(startDate: string, endDate: string) {
  const res = await fetch(
    `/api/admin/analytics/redemptions?startDate=${startDate}&endDate=${endDate}`
  );
  if (!res.ok) throw new Error("Failed to fetch redemptions");
  return await res.json();
}

async function fetchForecast(startDate: string, endDate: string, method: string = "linear") {
  const res = await fetch(
    `/api/admin/analytics/forecast?startDate=${startDate}&endDate=${endDate}&method=${method}&periods=7`
  );
  if (!res.ok) throw new Error("Failed to fetch forecast");
  return await res.json();
}

async function fetchCustomerSegments(method: string = "rules") {
  const res = await fetch(`/api/admin/analytics/customer-segments?method=${method}`);
  if (!res.ok) throw new Error("Failed to fetch customer segments");
  return await res.json();
}

async function fetchEmployeePerformance(startDate: string, endDate: string) {
  const res = await fetch(
    `/api/admin/analytics/employee-performance?startDate=${startDate}&endDate=${endDate}`
  );
  if (!res.ok) throw new Error("Failed to fetch employee performance");
  return await res.json();
}

async function fetchChurnRisk() {
  const res = await fetch(`/api/admin/analytics/churn-risk`);
  if (!res.ok) throw new Error("Failed to fetch churn risk");
  return await res.json();
}

async function fetchNextPurchase() {
  const res = await fetch(`/api/admin/analytics/next-purchase`);
  if (!res.ok) throw new Error("Failed to fetch next purchase predictions");
  return await res.json();
}

async function fetchCLV() {
  const res = await fetch(`/api/admin/analytics/customer-lifetime-value`);
  if (!res.ok) throw new Error("Failed to fetch customer lifetime value");
  return await res.json();
}

async function fetchTotalPurchases() {
  const res = await fetch("/api/admin/stats");
  if (!res.ok) throw new Error("Failed to fetch stats");
  const data = await res.json();
  return data.stats?.totalPurchases || 0;
}

export function AnalyticsOverview() {
  const today = new Date();
  // Set endDate to today to include all of today's data up to now
  const [startDate, setStartDate] = useState(format(subDays(today, 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  // Fetch data
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["analytics-transactions", startDate, endDate, groupBy],
    queryFn: () => fetchTransactions(startDate, endDate, groupBy),
  });

  const { data: customerGrowth, isLoading: growthLoading } = useQuery({
    queryKey: ["analytics-growth", startDate, endDate, groupBy],
    queryFn: () => fetchCustomerGrowth(startDate, endDate, groupBy),
  });

  const { data: redemptions, isLoading: redemptionsLoading } = useQuery({
    queryKey: ["analytics-redemptions", startDate, endDate],
    queryFn: () => fetchRedemptions(startDate, endDate),
  });

  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ["analytics-forecast", startDate, endDate],
    queryFn: () => fetchForecast(startDate, endDate, "linear"),
  });

  const { data: segments, isLoading: segmentsLoading } = useQuery({
    queryKey: ["analytics-segments"],
    queryFn: () => fetchCustomerSegments(),
  });

  const { data: employeePerformance, isLoading: employeeLoading } = useQuery({
    queryKey: ["analytics-employees", startDate, endDate],
    queryFn: () => fetchEmployeePerformance(startDate, endDate),
  });

  const { data: churnRisk, isLoading: churnLoading } = useQuery({
    queryKey: ["analytics-churn"],
    queryFn: () => fetchChurnRisk(),
  });

  const { data: nextPurchase, isLoading: nextPurchaseLoading } = useQuery({
    queryKey: ["analytics-next-purchase"],
    queryFn: () => fetchNextPurchase(),
  });

  const { data: clv, isLoading: clvLoading } = useQuery({
    queryKey: ["analytics-clv"],
    queryFn: () => fetchCLV(),
  });

  const { data: totalPurchases, isLoading: totalPurchasesLoading } = useQuery({
    queryKey: ["total-purchases"],
    queryFn: () => fetchTotalPurchases(),
  });

  // Prepare data for charts
  const transactionsData = transactions?.map((t: any) => ({
    date: t.date,
    purchases: t.purchases,
    redemptions: t.redemptions,
    total: t.total,
  })) || [];

  const growthData = customerGrowth?.map((g: any) => ({
    date: g.date,
    newCustomers: g.newCustomers,
    totalCustomers: g.totalCustomers,
  })) || [];

  const redemptionsData = redemptions
    ? [
        { name: "Coffee Rewards", value: redemptions.coffee || 0, description: "Free coffee rewards given" },
        { name: "Meal Rewards", value: redemptions.meal || 0, description: "Free meal rewards given" },
      ]
    : [];

  const segmentsData = segments?.distribution
    ?.map((d: any) => ({
      name: d.segment.charAt(0).toUpperCase() + d.segment.slice(1).replace("_", " "),
      value: d.count,
      description: d.description,
    }))
    .filter((d: any) => d.value > 0) || []; // Filter out zero values

  const employeeData = employeePerformance?.employees?.map((e: any) => ({
    name: e.employee_name,
    transactions: e.total,
    purchases: e.purchases,
    redemptions: e.redemptions,
  })) || [];

  // Calculate points distribution for histogram from segments data
  const pointsDistribution = segments?.segments?.reduce((acc: Record<string, number>, seg: any) => {
    const points = seg.points_balance || 0;
    let range = "";
    if (points === 0) range = "0";
    else if (points < 10) range = "1-9";
    else if (points < 25) range = "10-24";
    else if (points < 50) range = "25-49";
    else if (points < 100) range = "50-99";
    else range = "100+";
    
    acc[range] = (acc[range] || 0) + 1;
    return acc;
  }, {}) || {};

  const histogramData = Object.entries(pointsDistribution)
    .map(([range, count]) => ({
      range,
      count: count as number,
    }))
    .sort((a, b) => {
      // Sort by range order
      const order = ["0", "1-9", "10-24", "25-49", "50-99", "100+"];
      return order.indexOf(a.range) - order.indexOf(b.range);
    });

  const isLoading =
    transactionsLoading ||
    growthLoading ||
    redemptionsLoading ||
    forecastLoading ||
    segmentsLoading ||
    employeeLoading ||
    churnLoading ||
    nextPurchaseLoading ||
    clvLoading;

  return (
    <div className="space-y-8">
      {/* Date Range Picker */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Sales Overview</h2>
          <p className="text-muted-foreground">View your business performance over time</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as "day" | "week" | "month")}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="day">By Day</option>
            <option value="week">By Week</option>
            <option value="month">By Month</option>
          </select>
        </div>
      </div>

      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Sales Activity Summary */}
          {segments?.segments && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Customer Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {segments.segments.reduce((sum: number, s: any) => sum + (s.points_balance || 0), 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Across all customers</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Purchases
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {segments.segments.reduce((sum: number, s: any) => sum + (s.points_balance || 0), 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">1 purchase = 1 point</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Logged Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalPurchasesLoading ? "..." : (totalPurchases || 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Purchase transactions (all time)</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sales Activity */}
          <div>
            <AreaChart
              data={transactionsData}
              title="Sales Activity"
              description="Shows how many purchases and rewards were given over time (from transaction logs)"
              dataKeys={[
                { key: "purchases", label: "Purchases", color: "hsl(var(--chart-1))" },
                { key: "redemptions", label: "Rewards Given", color: "hsl(var(--chart-2))" },
              ]}
              yAxisLabel="Number of Transactions"
            />
            {transactionsData.length === 0 && segments?.segments && (
              <Card className="mt-4 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
                <CardContent className="pt-6">
                  <div className="text-sm">
                    <p className="font-medium mb-2 text-orange-900 dark:text-orange-100">
                      ⚠️ Data Discrepancy Notice
                    </p>
                    <p className="text-orange-800 dark:text-orange-200 mb-2">
                      The Sales Activity chart shows no transactions because the transactions table is empty.
                      However, customer profiles show:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-orange-800 dark:text-orange-200 mb-2">
                      <li>
                        <strong>{segments.segments.reduce((sum: number, s: any) => sum + (s.points_balance || 0), 0)} total points</strong> across all customers
                      </li>
                      <li>
                        <strong>{segments.segments.reduce((sum: number, s: any) => sum + (s.total_purchases || 0), 0)} total purchases</strong> recorded in profiles
                      </li>
                    </ul>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">
                      This suggests purchases were made before transaction logging was enabled. 
                      New purchases and redemptions will appear in the chart once they're recorded.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Customer Growth */}
          <LineChart
            data={growthData}
            title="New Customers Over Time"
            description="Shows how many new customers joined each day"
            dataKey="newCustomers"
            yAxisLabel="New Customers"
          />

          {/* Forecast */}
          {(forecast || (nextPurchase && nextPurchase.predictions)) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">Expected Sales Next Week</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {forecast?.forecast?.[0]?.value 
                        ? `Based on past trends, we expect ${forecast.forecast[0].value} sales`
                        : nextPurchase?.predictions?.length
                        ? `Based on customer behavior, we expect ${nextPurchase.predictions.filter((p: any) => 
                            new Date(p.predicted_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                          ).length} purchases in the next 7 days`
                        : "Insufficient data for forecast"}
                    </p>
                  </div>
                  {forecast?.trend && (
                    <div className="flex items-center gap-2">
                      {forecast.trend === "up" && (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      )}
                      {forecast.trend === "down" && (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                      {forecast.trend === "stable" && <Minus className="w-5 h-5 text-gray-600" />}
                      <span
                        className={`text-sm font-medium ${
                          forecast.trend === "up"
                            ? "text-green-600"
                            : forecast.trend === "down"
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {forecast.percentageChange > 0 ? "+" : ""}
                        {forecast.percentageChange}%
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {forecast?.historical?.length > 0 ? (
                    <>
                      <div className="text-muted-foreground">
                        Confidence:{" "}
                        <span className="font-medium capitalize">{forecast.confidence || "low"}</span>
                      </div>
                      <div className="text-muted-foreground">
                        Method:{" "}
                        <span className="font-medium capitalize">
                          {forecast.method === "linear" 
                            ? "Linear Regression (trend-based)" 
                            : forecast.method === "moving" 
                            ? "Moving Average (recent average)" 
                            : forecast.method === "exponential"
                            ? "Exponential Smoothing (weighted recent)"
                            : "Linear Regression (default)"}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        Based on:{" "}
                        <span className="font-medium">
                          {forecast.historical?.length || 0} days of purchase data
                        </span>
                        {" "}from the last 30 days
                      </div>
                      {forecast.confidence === "low" && (
                        <div className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                          ⚠️ Low confidence: More historical data needed for accurate predictions
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-muted-foreground">
                        Method:{" "}
                        <span className="font-medium">Customer Behavior Analysis</span>
                      </div>
                      <div className="text-muted-foreground">
                        Based on:{" "}
                        <span className="font-medium">
                          {nextPurchase?.predictions?.length || 0} customer purchase predictions
                        </span>
                        {" "}from individual customer patterns
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        ℹ️ Using customer-level predictions when transaction history is unavailable
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer Insights Section */}
          <div>
            <h3 className="text-xl font-display font-bold mb-4">Customer Insights</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Groups */}
              <PieChart
                data={segmentsData}
                title="Customer Groups"
                description="Shows how customers are divided into different groups based on their activity"
              />

              {/* Rewards Given */}
              <PieChart
                data={redemptionsData}
                title="Rewards Given"
                description="Shows the breakdown of coffee vs meal rewards given to customers"
              />
            </div>
          </div>

          {/* Employee Activity */}
          {employeeData.length > 0 && (
            <BarChart
              data={employeeData}
              title="Employee Activity"
              description="Shows how many transactions each employee processed"
              dataKeys={[
                { key: "transactions", label: "Total Transactions", color: "hsl(var(--chart-1))" },
              ]}
              xAxisKey="name"
              yAxisLabel="Transactions"
            />
          )}

          {/* Points Distribution */}
          {histogramData.length > 0 && (
            <Histogram
              data={histogramData}
              title="Points Distribution"
              description="Shows how customer points are distributed across different ranges"
              xAxisLabel="Points Range"
              yAxisLabel="Number of Customers"
            />
          )}

          {/* Predictive Analytics Section */}
          <div>
            <h3 className="text-xl font-display font-bold mb-4">Predictive Insights</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Churn Risk */}
              {churnRisk && churnRisk.atRisk && churnRisk.atRisk.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold">At-Risk Customers</CardTitle>
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">{churnRisk.atRisk.length}</div>
                    <p className="text-sm text-muted-foreground">
                      Customers who may stop visiting soon
                    </p>
                    <div className="mt-4 space-y-2">
                      {churnRisk.atRisk.slice(0, 3).map((customer: any, idx: number) => (
                        <div key={idx} className="text-sm">
                          <span className="font-medium">{customer.customer_name || "Unknown"}</span>
                          <span className="text-muted-foreground ml-2">
                            Risk: {customer.risk_score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Next Purchase Predictions */}
              {nextPurchase && nextPurchase.predictions && nextPurchase.predictions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Expected Purchases</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">
                      {nextPurchase.predictions.filter((p: any) => 
                        new Date(p.predicted_date) <= new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                      ).length}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Customers likely to purchase in next 2 weeks
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Customer Lifetime Value */}
              {clv && clv.clvs && clv.clvs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Top Customer Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">
                      ${clv.clvs[0]?.clv?.toFixed(2) || "0.00"}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Highest estimated lifetime value
                    </p>
                    <div className="mt-4 text-sm">
                      <span className="font-medium">{clv.clvs[0]?.customer_name || "Unknown"}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => {
                // PDF export functionality will be added
                alert("PDF export coming soon!");
              }}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export Report (PDF)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

