import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Mock dependencies
jest.mock('@supabase/ssr');
jest.mock('@supabase/supabase-js');
jest.mock('next/headers');

describe('Supabase Server Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createClient', () => {
    it('should create server client with correct configuration', async () => {
      const mockCookieStore = {
        getAll: jest.fn(() => []),
        set: jest.fn(),
      };
      
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
      
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';

      await createClient();

      expect(createServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      );
    });

    it('should handle cookie operations', async () => {
      const mockCookieStore = {
        getAll: jest.fn(() => [{ name: 'test', value: 'value' }]),
        set: jest.fn(),
      };
      
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
      
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';

      const client = await createClient();
      
      // Verify cookie handlers are set up
      expect(createServerClient).toHaveBeenCalled();
    });

    it('should handle setAll errors gracefully', async () => {
      const mockCookieStore = {
        getAll: jest.fn(() => []),
        set: jest.fn(() => {
          throw new Error('Cannot set cookie');
        }),
      };
      
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
      
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';

      // Should not throw
      await expect(createClient()).resolves.toBeDefined();
    });
  });

  describe('createServiceRoleClient', () => {
    it('should create service role client with correct credentials', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

      createServiceRoleClient();

      expect(createSupabaseClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'service-role-key',
        expect.objectContaining({
          auth: expect.objectContaining({
            autoRefreshToken: false,
            persistSession: false,
          }),
        })
      );
    });

    it('should throw error when SUPABASE_URL is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

      expect(() => createServiceRoleClient()).toThrow('Missing SUPABASE_SERVICE_ROLE_KEY');
    });

    it('should throw error when SERVICE_ROLE_KEY is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => createServiceRoleClient()).toThrow('Missing SUPABASE_SERVICE_ROLE_KEY');
    });

    it('should return client instance', () => {
      const mockClient = { auth: {}, from: jest.fn() };
      (createSupabaseClient as jest.Mock).mockReturnValue(mockClient);
      
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

      const client = createServiceRoleClient();

      expect(client).toBe(mockClient);
    });
  });
});

