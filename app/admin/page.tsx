"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Employee {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  points_balance: number;
  total_purchases: number;
  created_at: string;
}

interface Stats {
  totalCustomers: number;
  totalEmployees: number;
  activeEmployees: number;
  totalPoints: number;
  totalPurchases: number;
  pendingInvitations: number;
  topCustomers: Customer[];
}

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'invitations' | 'customers'>('overview');
  const router = useRouter();

  useEffect(() => {
    checkAdmin();
  }, [router]);

  const checkAdmin = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/auth/employee/login");
      return;
    }

    const { data: employee } = await supabase
      .from('employees')
      .select('is_admin, is_active')
      .eq('id', user.id)
      .single();

    if (!employee || !employee.is_active || !employee.is_admin) {
      router.push("/scan");
      return;
    }

    setIsAdmin(true);
  };

  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Checking access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button onClick={() => router.push('/scan')} variant="outline">
            Go to Scan Page
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'employees'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600'
            }`}
          >
            Employees
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'invitations'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600'
            }`}
          >
            Invitations
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'customers'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600'
            }`}
          >
            Customers
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'employees' && <EmployeesTab />}
        {activeTab === 'invitations' && <InvitationsTab />}
        {activeTab === 'customers' && <CustomersTab />}
      </div>
    </div>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading statistics...</p>;
  if (!stats) return <p>Failed to load statistics</p>;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Total Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.totalCustomers}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.activeEmployees} / {stats.totalEmployees}</p>
          <p className="text-sm text-gray-500">Active / Total</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Points</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.totalPoints.toLocaleString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Purchases</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.totalPurchases.toLocaleString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.pendingInvitations}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topCustomers.slice(0, 5).map((customer, idx) => (
              <div key={customer.id} className="flex justify-between">
                <span className="text-sm">
                  {idx + 1}. {customer.full_name || 'Anonymous'}
                </span>
                <span className="text-sm font-semibold">{customer.points_balance} pts</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmployeesTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await fetch('/api/admin/employees');
      const data = await res.json();
      if (data.success) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setEditForm({
      username: employee.username,
      full_name: employee.full_name,
      is_active: employee.is_active,
      is_admin: employee.is_admin,
    });
  };

  const handleSave = async (id: string) => {
    // Prevent admin from removing their own admin status
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && id === user.id && editForm.is_admin === false) {
      alert('You cannot remove admin status from your own account');
      return;
    }

    // Validate username is not empty
    if (editForm.username && editForm.username.trim() === '') {
      alert('Username cannot be empty');
      return;
    }

    try {
      const res = await fetch('/api/admin/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        loadEmployees();
      } else {
        alert(data.error || 'Failed to update employee');
      }
    } catch (err) {
      alert('Failed to update employee');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean, isAdmin: boolean) => {
    // Prevent admin from deactivating themselves
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && id === user.id && isAdmin) {
      alert('You cannot deactivate your own admin account');
      return;
    }

    try {
      const res = await fetch('/api/admin/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus }),
      });

      const data = await res.json();
      if (data.success) {
        loadEmployees();
      } else {
        alert(data.error || 'Failed to update employee');
      }
    } catch (err) {
      alert('Failed to update employee');
    }
  };

  if (loading) return <p>Loading employees...</p>;

  return (
    <div className="space-y-4">
      {employees.map((emp) => (
        <Card key={emp.id}>
          <CardContent className="pt-6">
            {editingId === emp.id ? (
              <div className="space-y-4">
                <div>
                  <Label>Username</Label>
                  <Input
                    value={editForm.username || ''}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={editForm.full_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.is_active || false}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.is_admin || false}
                      onChange={(e) => setEditForm({ ...editForm, is_admin: e.target.checked })}
                    />
                    Admin
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleSave(emp.id)}>Save</Button>
                  <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{emp.full_name || emp.email}</p>
                  <p className="text-sm text-gray-500">{emp.email} • @{emp.username}</p>
                  <p className="text-xs text-gray-400">
                    Created: {new Date(emp.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {emp.is_admin && <Badge variant="default">Admin</Badge>}
                  {emp.is_active ? (
                    <Badge className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(emp.id, emp.is_active, emp.is_admin)}
                  >
                    {emp.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(emp)}>
                    Edit
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InvitationsTab() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const res = await fetch('/api/admin/invitations');
      const data = await res.json();
      if (data.success) {
        setInvitations(data.invitations);
      }
    } catch (err) {
      console.error('Failed to load invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInviteUrl("");

    try {
      const res = await fetch('/api/admin/create-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setInviteUrl(data.inviteUrl);
      setInviteEmail("");
      loadInvitations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <p>Loading invitations...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createInvitation} className="space-y-4">
            <div>
              <Label htmlFor="email">Employee Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="employee@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit">Create Invitation</Button>
          </form>

          {error && <p className="text-red-500 mt-2">{error}</p>}
          
          {inviteUrl && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
              <p className="font-semibold mb-2">Invitation created!</p>
              <p className="text-sm text-gray-600 mb-2">Share this link:</p>
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="bg-white" />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl);
                    alert('Copied!');
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitation History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-semibold">{inv.email}</p>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(inv.created_at).toLocaleDateString()}
                    {inv.used_at && ` • Used: ${new Date(inv.used_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div>
                  {inv.used_at ? (
                    <Badge className="bg-green-500">Used</Badge>
                  ) : new Date(inv.expires_at) < new Date() ? (
                    <Badge variant="destructive">Expired</Badge>
                  ) : (
                    <Badge>Pending</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const res = await fetch('/api/admin/customers');
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading customers...</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>All Customers ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {customers.map((customer) => (
              <div key={customer.id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-semibold">{customer.full_name || 'Anonymous'}</p>
                  <p className="text-sm text-gray-500">
                    {customer.email || 'No email'} • 
                    Joined: {new Date(customer.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{customer.points_balance} points</p>
                  <p className="text-sm text-gray-500">{customer.total_purchases} purchases</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

