'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  UserCheck, 
  Coins, 
  ShoppingBag, 
  Mail, 
  LayoutDashboard,
  Search,
  Coffee,
  Loader2
} from "lucide-react";

import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { StatCard } from "@/components/admin/StatCard";
import { CustomerTable } from "@/components/admin/CustomerTable";
import { EmployeeTable } from "@/components/admin/EmployeeTable";
import { InvitationTable } from "@/components/admin/InvitationTable";
import { TopCustomers } from "@/components/admin/TopCustomers";
import { InviteForm } from "@/components/admin/InviteForm";
import { createClient } from "@/lib/supabase/client";

// API fetch functions
async function fetchStats() {
  const res = await fetch('/api/admin/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  const data = await res.json();
  return data.stats;
}

async function fetchCustomers() {
  const res = await fetch('/api/admin/customers');
  if (!res.ok) throw new Error('Failed to fetch customers');
  const data = await res.json();
  return data.customers;
}

async function fetchEmployees() {
  const res = await fetch('/api/admin/employees');
  if (!res.ok) throw new Error('Failed to fetch employees');
  const data = await res.json();
  return data.employees;
}

async function fetchInvitations() {
  const res = await fetch('/api/admin/invitations');
  if (!res.ok) throw new Error('Failed to fetch invitations');
  const data = await res.json();
  return data.invitations;
}

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();
  const [customerSearch, setCustomerSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Force light mode for admin dashboard
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  // Check authentication and authorization
  useEffect(() => {
    async function checkAuth() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        router.push('/auth/employee/login');
      return;
    }

      // Check if user is an active admin employee
      const { data: employee, error } = await supabase
      .from('employees')
      .select('is_admin, is_active')
      .eq('id', user.id)
      .single();

      if (error || !employee || !employee.is_active || !employee.is_admin) {
        // Not an admin or not active, redirect to scan page
        router.push('/scan');
      return;
    }

      setIsAuthorized(true);
      setIsCheckingAuth(false);
    }

    checkAuth();
  }, [router]);

  // Fetch data with React Query
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchStats,
    enabled: isAuthorized,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: fetchCustomers,
    enabled: isAuthorized,
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['admin-employees'],
    queryFn: fetchEmployees,
    enabled: isAuthorized,
  });

  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ['admin-invitations'],
    queryFn: fetchInvitations,
    enabled: isAuthorized,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Refresh data after invitation creation
  const handleInviteCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  };

  // Refresh data after employee update
  const handleEmployeeUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-employees'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  };

  const filteredCustomers = customers.filter((c: any) => 
    c.full_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredEmployees = employees.filter((e: any) => 
    e.full_name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    e.email.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    e.username.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const topCustomers = stats?.topCustomers || [];

  // Show loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authorized (will redirect)
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-background border border-border p-1 h-auto flex-wrap">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="customers"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Customers</span>
            </TabsTrigger>
            <TabsTrigger 
              value="employees"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Employees</span>
            </TabsTrigger>
            <TabsTrigger 
              value="invitations"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Invitations</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Stats Grid */}
            {statsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
            ) : stats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                  title="Total Customers"
                  value={stats.totalCustomers.toLocaleString()}
                  subtitle="Registered members"
                  icon={Users}
                  trend={{ value: 12, isPositive: true }}
                  delay={1}
                />
                <StatCard
                  title="Active Employees"
                  value={`${stats.activeEmployees}/${stats.totalEmployees}`}
                  subtitle="Team members"
                  icon={UserCheck}
                  delay={2}
                />
                <StatCard
                  title="Total Points"
                  value={stats.totalPoints.toLocaleString()}
                  subtitle="Across all customers"
                  icon={Coins}
                  trend={{ value: 8, isPositive: true }}
                  delay={3}
                />
                <StatCard
                  title="Total Purchases"
                  value={stats.totalPurchases.toLocaleString()}
                  subtitle="Transactions recorded"
                  icon={ShoppingBag}
                  trend={{ value: 15, isPositive: true }}
                  delay={4}
                />
                <StatCard
                  title="Pending Invitations"
                  value={stats.pendingInvitations.toString()}
                  subtitle="Awaiting response"
                  icon={Mail}
                  delay={5}
                />
                <StatCard
                  title="Rewards Redeemed"
                  value={stats.rewardsRedeemed?.toLocaleString() || "0"}
                  subtitle="Coffee & meals"
                  icon={Coffee}
                  trend={{ value: 5, isPositive: true }}
                  delay={6}
                />
    </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Failed to load statistics
              </div>
            )}

            {/* Top Customers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopCustomers customers={topCustomers} />
              
              <div className="rounded-xl border border-border bg-white p-6 opacity-0 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-2 mb-6">
                  <Coffee className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-xl font-semibold text-foreground">Reward Progress</h3>
                </div>
                <div className="space-y-6">
                <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Coffee Rewards (every 10 pts)</span>
                      <span className="text-sm font-medium text-foreground">{stats?.coffeeRewardsRedeemed || 0} claimed</span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                        style={{ width: `${stats?.coffeeRewardsProgress || 0}%` }}
                  />
                </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Meal Rewards (every 25 pts)</span>
                      <span className="text-sm font-medium text-foreground">{stats?.mealRewardsRedeemed || 0} claimed</span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-warning to-warning/70 rounded-full transition-all duration-500"
                        style={{ width: `${stats?.mealRewardsProgress || 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Average points per customer</span>
                      <span className="text-2xl font-display font-bold text-primary">
                        {stats && stats.totalCustomers > 0 
                          ? Math.round(stats.totalPoints / stats.totalCustomers)
                          : 0}
                      </span>
                    </div>
                </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                <h2 className="text-2xl font-display font-bold">Customers</h2>
                <p className="text-muted-foreground">Manage your loyalty program members</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-10"
                />
                </div>
                </div>
            {customersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <CustomerTable customers={filteredCustomers} />
            )}
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h2 className="text-2xl font-display font-bold">Employees</h2>
                <p className="text-muted-foreground">Manage your team members</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                  placeholder="Search employees..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {employeesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
              <EmployeeTable 
                employees={filteredEmployees} 
                onEmployeeUpdated={handleEmployeeUpdated}
              />
            )}
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="space-y-6">
            <div>
              <h2 className="text-2xl font-display font-bold">Invitations</h2>
              <p className="text-muted-foreground">Invite new team members to join</p>
                </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <InviteForm onInviteCreated={handleInviteCreated} />
              </div>
              <div className="lg:col-span-2">
                {invitationsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
                ) : (
                  <InvitationTable invitations={invitations} />
                )}
              </div>
          </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
