import { notifyPassUpdate, notifyRewardEarned, isPushNotificationsConfigured } from '@/lib/passkit/push-notifications';
import { createServiceRoleClient } from '@/lib/supabase/server';
import apn from 'node-apn';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

jest.mock('node-apn', () => ({
  __esModule: true,
  default: {
    Provider: jest.fn(),
  },
  Notification: jest.fn(),
}));

describe('Push Notifications', () => {
  const originalEnv = process.env;
  let mockSupabase: any;
  let mockProvider: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    mockSupabase = {
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      not: jest.fn(() => mockSupabase),
    };
    
    (createServiceRoleClient as jest.Mock).mockReturnValue(mockSupabase);

    mockProvider = {
      send: jest.fn(),
      shutdown: jest.fn(),
    };
    
    (apn.Provider as jest.Mock).mockImplementation(() => mockProvider);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isPushNotificationsConfigured', () => {
    it('should return true when all required env vars are set', () => {
      process.env.APNS_KEY_ID = 'test-key-id';
      process.env.APNS_TEAM_ID = 'test-team-id';
      process.env.APNS_KEY_BASE64 = 'dGVzdA==';
      process.env.PASS_TYPE_ID = 'pass.com.test';

      expect(isPushNotificationsConfigured()).toBe(true);
    });

    it('should return false when APNS_KEY_ID is missing', () => {
      delete process.env.APNS_KEY_ID;
      process.env.APNS_TEAM_ID = 'test-team-id';
      process.env.APNS_KEY_BASE64 = 'dGVzdA==';
      process.env.PASS_TYPE_ID = 'pass.com.test';

      expect(isPushNotificationsConfigured()).toBe(false);
    });

    it('should return false when APNS_TEAM_ID is missing', () => {
      process.env.APNS_KEY_ID = 'test-key-id';
      delete process.env.APNS_TEAM_ID;
      process.env.APNS_KEY_BASE64 = 'dGVzdA==';
      process.env.PASS_TYPE_ID = 'pass.com.test';

      expect(isPushNotificationsConfigured()).toBe(false);
    });

    it('should return false when APNS_KEY_BASE64 is missing', () => {
      process.env.APNS_KEY_ID = 'test-key-id';
      process.env.APNS_TEAM_ID = 'test-team-id';
      delete process.env.APNS_KEY_BASE64;
      process.env.PASS_TYPE_ID = 'pass.com.test';

      expect(isPushNotificationsConfigured()).toBe(false);
    });

    it('should return false when PASS_TYPE_ID is missing', () => {
      process.env.APNS_KEY_ID = 'test-key-id';
      process.env.APNS_TEAM_ID = 'test-team-id';
      process.env.APNS_KEY_BASE64 = 'dGVzdA==';
      delete process.env.PASS_TYPE_ID;

      expect(isPushNotificationsConfigured()).toBe(false);
    });
  });

  describe('notifyPassUpdate', () => {
    it('should return 0 when no registrations found', async () => {
      mockSupabase.not.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await notifyPassUpdate('user-123');

      expect(result).toBe(0);
    });

    it('should return 0 when database error occurs', async () => {
      mockSupabase.not.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await notifyPassUpdate('user-123');

      expect(result).toBe(0);
    });

    it('should return count when APNs is not configured', async () => {
      delete process.env.APNS_KEY_ID;
      mockSupabase.not.mockResolvedValue({
        data: [
          { device_library_identifier: 'device1', push_token: 'token1' },
          { device_library_identifier: 'device2', push_token: 'token2' },
        ],
        error: null,
      });

      const result = await notifyPassUpdate('user-123');

      expect(result).toBe(2);
      expect(apn.Provider).not.toHaveBeenCalled();
    });

    it('should send notifications when APNs is configured', async () => {
      process.env.APNS_KEY_ID = 'test-key-id';
      process.env.APNS_TEAM_ID = 'test-team-id';
      process.env.APNS_KEY_BASE64 = Buffer.from('test-key').toString('base64');
      process.env.APNS_PRODUCTION = 'true';
      process.env.PASS_TYPE_ID = 'pass.com.test';

      mockSupabase.not.mockResolvedValue({
        data: [
          { device_library_identifier: 'device1', push_token: 'token1' },
        ],
        error: null,
      });

      mockProvider.send.mockResolvedValue({
        sent: ['token1'],
        failed: [],
      });

      const result = await notifyPassUpdate('user-123');

      expect(result).toBe(1);
      expect(apn.Provider).toHaveBeenCalled();
      expect(mockProvider.send).toHaveBeenCalled();
      expect(mockProvider.shutdown).toHaveBeenCalled();
    });

    it('should handle JSON push tokens', async () => {
      process.env.APNS_KEY_ID = 'test-key-id';
      process.env.APNS_TEAM_ID = 'test-team-id';
      process.env.APNS_KEY_BASE64 = Buffer.from('test-key').toString('base64');
      process.env.APNS_PRODUCTION = 'true';
      process.env.PASS_TYPE_ID = 'pass.com.test';

      mockSupabase.not.mockResolvedValue({
        data: [
          { 
            device_library_identifier: 'device1', 
            push_token: JSON.stringify({ pushToken: 'actual-token' }),
          },
        ],
        error: null,
      });

      mockProvider.send.mockResolvedValue({
        sent: ['actual-token'],
        failed: [],
      });

      await notifyPassUpdate('user-123');

      expect(mockProvider.send).toHaveBeenCalled();
    });

    it('should handle failed notifications', async () => {
      process.env.APNS_KEY_ID = 'test-key-id';
      process.env.APNS_TEAM_ID = 'test-team-id';
      process.env.APNS_KEY_BASE64 = Buffer.from('test-key').toString('base64');
      process.env.APNS_PRODUCTION = 'true';
      process.env.PASS_TYPE_ID = 'pass.com.test';

      mockSupabase.not.mockResolvedValue({
        data: [
          { device_library_identifier: 'device1', push_token: 'token1' },
        ],
        error: null,
      });

      mockProvider.send.mockResolvedValue({
        sent: [],
        failed: [{ response: { reason: 'BadDeviceToken' } }],
      });

      const result = await notifyPassUpdate('user-123');

      expect(result).toBe(0);
    });

    it('should handle APNs errors gracefully', async () => {
      process.env.APNS_KEY_ID = 'test-key-id';
      process.env.APNS_TEAM_ID = 'test-team-id';
      process.env.APNS_KEY_BASE64 = Buffer.from('test-key').toString('base64');
      process.env.APNS_PRODUCTION = 'true';
      process.env.PASS_TYPE_ID = 'pass.com.test';

      mockSupabase.not.mockResolvedValue({
        data: [
          { device_library_identifier: 'device1', push_token: 'token1' },
        ],
        error: null,
      });

      mockProvider.send.mockRejectedValue(new Error('APNs error'));

      const result = await notifyPassUpdate('user-123');

      expect(result).toBe(0);
    });

    it('should use default pass type identifier', async () => {
      delete process.env.PASS_TYPE_ID;
      mockSupabase.not.mockResolvedValue({
        data: [],
        error: null,
      });

      await notifyPassUpdate('user-123');

      expect(mockSupabase.eq).toHaveBeenCalledWith('pass_type_identifier', 'pass.com.vigocoffee.loyalty');
    });
  });

  describe('notifyRewardEarned', () => {
    it('should call notifyPassUpdate', async () => {
      mockSupabase.not.mockResolvedValue({
        data: [],
        error: null,
      });

      await notifyRewardEarned('user-123', 'coffee');

      expect(mockSupabase.eq).toHaveBeenCalledWith('serial_number', 'user-123');
    });

    it('should use custom pass type identifier', async () => {
      mockSupabase.not.mockResolvedValue({
        data: [],
        error: null,
      });

      await notifyRewardEarned('user-123', 'meal', 'custom.pass.id');

      expect(mockSupabase.eq).toHaveBeenCalledWith('pass_type_identifier', 'custom.pass.id');
    });
  });
});

