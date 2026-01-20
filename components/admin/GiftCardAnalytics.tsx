"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { LineChart } from "./charts/LineChart";
import { AreaChart } from "./charts/AreaChart";
import { Histogram } from "./charts/Histogram";
import { PieChart } from "./charts/PieChart";
import { DateRangePicker } from "./DateRangePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { HelpTooltip } from "./HelpTooltip";

// API fetch functions
async function fetchGiftCardTransactions(startDate: string, endDate: string, groupBy: string) {
  const res = await fetch(
    `/api/admin/analytics/gift-card-transactions?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`
  );
  if (!res.ok) throw new Error("Failed to fetch gift card transactions");
  const data = await res.json();
  return data.data || [];
}

async function fetchGiftCardGrowth(startDate: string, endDate: string, groupBy: string) {
  const res = await fetch(
    `/api/admin/analytics/gift-card-growth?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`
  );
  if (!res.ok) throw new Error("Failed to fetch gift card growth");
  const data = await res.json();
  return data.data || [];
}

async function fetchGiftCardStats() {
  const res = await fetch("/api/admin/gift-cards/stats");
  if (!res.ok) throw new Error("Failed to fetch gift card stats");
  return await res.json();
}

export function GiftCardAnalytics() {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(subDays(today, 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  // Fetch data
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["gift-card-transactions", startDate, endDate, groupBy],
    queryFn: () => fetchGiftCardTransactions(startDate, endDate, groupBy),
  });

  const { data: growth, isLoading: growthLoading } = useQuery({
    queryKey: ["gift-card-growth", startDate, endDate, groupBy],
    queryFn: () => fetchGiftCardGrowth(startDate, endDate, groupBy),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["gift-card-stats"],
    queryFn: fetchGiftCardStats,
  });

  // Prepare data for charts
  const transactionsData = transactions?.map((t: any) => ({
    date: t.date,
    transactions: t.transactions,
    totalAmount: t.totalAmount,
  })) || [];

  const growthData = growth?.map((g: any) => ({
    date: g.date,
    newGiftCards: g.newGiftCards,
    totalGiftCards: g.totalGiftCards,
  })) || [];

  // Calculate balance distribution from gift cards
  const { data: allGiftCards } = useQuery({
    queryKey: ["gift-cards-for-distribution"],
    queryFn: async () => {
      const res = await fetch("/api/admin/gift-cards");
      if (!res.ok) return [];
      const data = await res.json();
      return data.giftCards || [];
    },
  });

  const balanceDistribution: Record<string, number> = {};
  if (allGiftCards) {
    allGiftCards.forEach((gc: any) => {
      const balance = Number(gc.balance_mxn || 0);
      let range = "";
      if (balance < 100) range = "$0-100";
      else if (balance < 250) range = "$100-250";
      else if (balance < 500) range = "$250-500";
      else if (balance < 1000) range = "$500-1000";
      else range = "$1000+";
      
      balanceDistribution[range] = (balanceDistribution[range] || 0) + 1;
    });
  }

  const histogramData = Object.entries(balanceDistribution)
    .map(([range, count]) => ({
      range,
      count: count as number,
    }))
    .sort((a, b) => {
      const order = ["$0-100", "$100-250", "$250-500", "$500-1000", "$1000+"];
      return order.indexOf(a.range) - order.indexOf(b.range);
    });

  // Status breakdown data
  const statusData = stats?.stats
    ? [
        {
          name: "Active",
          value: stats.stats.activeGiftCards || 0,
          description: "Gift cards that are currently active",
        },
        {
          name: "Inactive",
          value: (stats.stats.totalGiftCards || 0) - (stats.stats.activeGiftCards || 0),
          description: "Gift cards that have been deactivated",
        },
      ].filter((d) => d.value > 0)
    : [];

  const claimedData = stats?.stats
    ? [
        {
          name: "Claimed",
          value: stats.stats.claimedGiftCards || 0,
          description: "Gift cards that have been claimed by recipients",
        },
        {
          name: "Unclaimed",
          value: (stats.stats.totalGiftCards || 0) - (stats.stats.claimedGiftCards || 0),
          description: "Gift cards that have not been claimed yet",
        },
      ].filter((d) => d.value > 0)
    : [];

  const isLoading = transactionsLoading || growthLoading || statsLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      {/* Date Range Picker */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Gift Card Analytics</h2>
          <p className="text-muted-foreground">View gift card performance and usage over time</p>
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
          {/* Summary Cards */}
          {stats?.stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Gift Cards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.stats.totalGiftCards || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Created</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Balance Issued
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.stats.totalBalanceIssued || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">MXN</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Balance Used
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.stats.totalBalanceUsed || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.stats.totalBalanceIssued > 0
                      ? `${((stats.stats.totalBalanceUsed / stats.stats.totalBalanceIssued) * 100).toFixed(1)}% used`
                      : '0% used'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Average Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.stats.averageGiftCardValue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Per gift card</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Gift Card Activity and Growth */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gift Card Activity */}
            <AreaChart
              data={transactionsData}
              title="Gift Card Activity"
              description="Shows gift card transactions and total amount deducted over time"
              dataKeys={[
                { key: "transactions", label: "Transactions", color: "hsl(var(--chart-1))" },
                { key: "totalAmount", label: "Total Amount (MXN)", color: "hsl(var(--chart-2))" },
              ]}
              yAxisLabel="Transactions / Amount"
              groupBy={groupBy}
            />

            {/* Gift Card Growth */}
            <LineChart
              data={growthData}
              title="Gift Card Growth"
              description="Shows how many new gift cards were created over time"
              dataKey="newGiftCards"
              yAxisLabel="New Gift Cards"
              groupBy={groupBy}
            />
          </div>

          {/* Status Breakdown and Balance Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            {statusData.length > 0 && (
              <PieChart
                data={statusData}
                title="Status Breakdown"
                description="Shows the breakdown of active vs inactive gift cards"
              />
            )}

            {/* Claimed vs Unclaimed */}
            {claimedData.length > 0 && (
              <PieChart
                data={claimedData}
                title="Claimed vs Unclaimed"
                description="Shows how many gift cards have been claimed by recipients"
              />
            )}
          </div>

          {/* Balance Distribution */}
          {histogramData.length > 0 && (
            <Histogram
              data={histogramData}
              title="Balance Distribution"
              description="Shows how gift card balances are distributed across different ranges"
              xAxisLabel="Balance Range (MXN)"
              yAxisLabel="Number of Gift Cards"
            />
          )}
        </>
      )}
    </div>
  );
}
