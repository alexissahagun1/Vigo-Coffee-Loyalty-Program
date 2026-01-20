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
import { Loader2, Gift, Wallet, TrendingDown, Coins } from "lucide-react";
import { HelpTooltip } from "./HelpTooltip";
import { cn } from "@/lib/utils";

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
      {/* Header with controls */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold tracking-tight">Gift Card Analytics</h2>
            <p className="text-muted-foreground mt-0.5">Performance and usage over time</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-1 hidden sm:inline">Group by:</span>
            <div className="inline-flex p-0.5 rounded-lg bg-muted/60 border border-border/60">
              {(["day", "week", "month"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroupBy(g)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                    groupBy === g
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {g === "day" ? "Day" : g === "week" ? "Week" : "Month"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {stats?.stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="overflow-hidden border-border/70 shadow-sm hover:shadow transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Gift Cards
                    </CardTitle>
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Gift className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-display font-bold tabular-nums">
                    {stats.stats.totalGiftCards || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Created</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-border/70 shadow-sm hover:shadow transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Balance Issued
                    </CardTitle>
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-[hsl(var(--chart-2))]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-display font-bold tabular-nums">
                    {formatCurrency(stats.stats.totalBalanceIssued || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">MXN issued</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-border/70 shadow-sm hover:shadow transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Balance Used
                    </CardTitle>
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <TrendingDown className="h-4 w-4 text-[hsl(var(--chart-3))]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-display font-bold tabular-nums">
                    {formatCurrency(stats.stats.totalBalanceUsed || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.stats.totalBalanceIssued > 0
                      ? `${((stats.stats.totalBalanceUsed / stats.stats.totalBalanceIssued) * 100).toFixed(1)}% used`
                      : "0% used"}
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-border/70 shadow-sm hover:shadow transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Average Value
                    </CardTitle>
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <Coins className="h-4 w-4 text-[hsl(var(--chart-4))]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-display font-bold tabular-nums">
                    {formatCurrency(stats.stats.averageGiftCardValue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Per gift card</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Activity & Growth */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Activity & growth</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AreaChart
                data={transactionsData}
                title="Gift Card Activity"
                description="Transactions and amount deducted over time"
                dataKeys={[
                  { key: "transactions", label: "Transactions", color: "hsl(var(--chart-1))", format: "number" },
                  { key: "totalAmount", label: "Amount (MXN)", color: "hsl(var(--chart-2))", format: "currency" },
                ]}
                yAxisLabel="Transactions / Amount"
                groupBy={groupBy}
              />

              <LineChart
                data={growthData}
                title="Gift Card Growth"
                description="New gift cards created over time"
                dataKey="newGiftCards"
                seriesName="New gift cards"
                yAxisLabel="New Gift Cards"
                groupBy={groupBy}
              />
            </div>
          </div>

          {/* Status & claim */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Status & claim</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {statusData.length > 0 && (
                <PieChart
                  data={statusData}
                  title="Status Breakdown"
                  description="Active vs inactive gift cards"
                />
              )}
              {claimedData.length > 0 && (
                <PieChart
                  data={claimedData}
                  title="Claimed vs Unclaimed"
                  description="Claimed by recipients vs not yet used"
                />
              )}
            </div>
          </div>

          {/* Balance distribution */}
          {histogramData.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Balance distribution</h3>
              <Histogram
                data={histogramData}
                title="Balance Distribution"
                description="Gift card balances by range"
                xAxisLabel="Balance Range (MXN)"
                yAxisLabel="Number of Gift Cards"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
