import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const groupBy = searchParams.get("groupBy") || "day"; // day, week, month

    const supabase = createServiceRoleClient();

    // Get all profiles with created_at
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, created_at");

    if (error) {
      console.error("Error fetching profiles:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch customer growth data" },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
      });
    }

    // Filter by date if provided
    let filteredProfiles = profiles;
    if (startDate || endDate) {
      filteredProfiles = profiles.filter((profile: any) => {
        if (!profile.created_at) return false;
        const date = new Date(profile.created_at);
        if (startDate && date < startOfDay(parseISO(startDate))) return false;
        if (endDate && date > endOfDay(parseISO(endDate))) return false;
        return true;
      });
    }

    // Sort by creation date
    filteredProfiles.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateA.getTime() - dateB.getTime();
    });

    // Group by time period
    const grouped: Record<string, number> = {};

    filteredProfiles.forEach((profile: any) => {
      if (!profile.created_at) return;
      let key: string;
      const date = new Date(profile.created_at);

      switch (groupBy) {
        case "week":
          key = format(date, "yyyy-'W'ww");
          break;
        case "month":
          key = format(date, "yyyy-MM");
          break;
        default: // day
          key = format(date, "yyyy-MM-dd");
      }

      grouped[key] = (grouped[key] || 0) + 1;
    });

    // Convert to array format with cumulative count
    let cumulative = 0;
    const data = Object.entries(grouped)
      .map(([date, count]) => {
        cumulative += count;
        return {
          date,
          newCustomers: count,
          totalCustomers: cumulative,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      data,
      total: filteredProfiles.length,
    });
  } catch (error: any) {
    console.error("Customer growth analytics error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
