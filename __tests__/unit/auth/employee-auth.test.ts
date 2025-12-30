import { verifyEmployeeAuth, requireEmployeeAuth, requireAdminAuth } from '@/lib/auth/employee-auth';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}));

describe('Employee Authentication', () => {
  let mockSupabase: any;
  let mockServiceSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
    };
    
    mockServiceSupabase = {
      from: jest.fn(() => mockServiceSupabase),
      select: jest.fn(() => mockServiceSupabase),
      eq: jest.fn(() => mockServiceSupabase),
      single: jest.fn(),
    };
    
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (createServiceRoleClient as jest.Mock).mockReturnValue(mockServiceSupabase);
  });

  describe('verifyEmployeeAuth', () => {
    it('should return not authenticated when user is not logged in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const result = await verifyEmployeeAuth();

      expect(result.isAuthenticated).toBe(false);
      expect(result.isEmployee).toBe(false);
      expect(result.employeeId).toBeNull();
      expect(result.error).toBe('Not authenticated');
    });

    it('should return not employee when user is not in employees table', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockServiceSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await verifyEmployeeAuth();

      expect(result.isAuthenticated).toBe(true);
      expect(result.isEmployee).toBe(false);
      expect(result.employeeId).toBeNull();
      expect(result.error).toBe('User is not an employee');
    });

    it('should return employee info when user is an active employee', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'employee-123' } },
        error: null,
      });

      mockServiceSupabase.single.mockResolvedValue({
        data: {
          id: 'employee-123',
          is_active: true,
          is_admin: false,
        },
        error: null,
      });

      const result = await verifyEmployeeAuth();

      expect(result.isAuthenticated).toBe(true);
      expect(result.isEmployee).toBe(true);
      expect(result.isActive).toBe(true);
      expect(result.isAdmin).toBe(false);
      expect(result.employeeId).toBe('employee-123');
    });

    it('should return admin info when user is an admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      mockServiceSupabase.single.mockResolvedValue({
        data: {
          id: 'admin-123',
          is_active: true,
          is_admin: true,
        },
        error: null,
      });

      const result = await verifyEmployeeAuth();

      expect(result.isAuthenticated).toBe(true);
      expect(result.isEmployee).toBe(true);
      expect(result.isActive).toBe(true);
      expect(result.isAdmin).toBe(true);
      expect(result.employeeId).toBe('admin-123');
    });

    it('should handle errors gracefully', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database error'));

      const result = await verifyEmployeeAuth();

      expect(result.isAuthenticated).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('requireEmployeeAuth', () => {
    it('should return 401 when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const result = await requireEmployeeAuth();

      expect(result).toBeInstanceOf(NextResponse);
      expect(result?.status).toBe(401);
    });

    it('should return 403 when user is not an employee', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockServiceSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await requireEmployeeAuth();

      expect(result).toBeInstanceOf(NextResponse);
      expect(result?.status).toBe(403);
    });

    it('should return 403 when employee is not active', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'employee-123' } },
        error: null,
      });

      mockServiceSupabase.single.mockResolvedValue({
        data: {
          id: 'employee-123',
          is_active: false,
          is_admin: false,
        },
        error: null,
      });

      const result = await requireEmployeeAuth();

      expect(result).toBeInstanceOf(NextResponse);
      expect(result?.status).toBe(403);
    });

    it('should return null when authentication passes', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'employee-123' } },
        error: null,
      });

      mockServiceSupabase.single.mockResolvedValue({
        data: {
          id: 'employee-123',
          is_active: true,
          is_admin: false,
        },
        error: null,
      });

      const result = await requireEmployeeAuth();

      expect(result).toBeNull();
    });
  });

  describe('requireAdminAuth', () => {
    it('should return 401 when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const result = await requireAdminAuth();

      expect(result).toBeInstanceOf(NextResponse);
      expect(result?.status).toBe(401);
    });

    it('should return 403 when user is not an employee', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockServiceSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await requireAdminAuth();

      expect(result).toBeInstanceOf(NextResponse);
      expect(result?.status).toBe(403);
    });

    it('should return 403 when employee is not active', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'employee-123' } },
        error: null,
      });

      mockServiceSupabase.single.mockResolvedValue({
        data: {
          id: 'employee-123',
          is_active: false,
          is_admin: true,
        },
        error: null,
      });

      const result = await requireAdminAuth();

      expect(result).toBeInstanceOf(NextResponse);
      expect(result?.status).toBe(403);
    });

    it('should return 403 when employee is not admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'employee-123' } },
        error: null,
      });

      mockServiceSupabase.single.mockResolvedValue({
        data: {
          id: 'employee-123',
          is_active: true,
          is_admin: false,
        },
        error: null,
      });

      const result = await requireAdminAuth();

      expect(result).toBeInstanceOf(NextResponse);
      expect(result?.status).toBe(403);
    });

    it('should return null when admin authentication passes', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      mockServiceSupabase.single.mockResolvedValue({
        data: {
          id: 'admin-123',
          is_active: true,
          is_admin: true,
        },
        error: null,
      });

      const result = await requireAdminAuth();

      expect(result).toBeNull();
    });
  });
});

