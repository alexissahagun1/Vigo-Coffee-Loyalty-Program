import {
  getWalletClient,
  isGoogleWalletConfigured,
  getIssuerId,
  getClassSuffix,
  getClassId,
  getServiceAccountCredentials,
} from '@/lib/google-wallet/auth';

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    walletobjects: jest.fn(),
    auth: {
      GoogleAuth: jest.fn(),
    },
  },
}));

describe('Google Wallet Auth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Clear module cache to reset singleton
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isGoogleWalletConfigured', () => {
    it('should return true when all required env vars are set', () => {
      process.env.GOOGLE_WALLET_ISSUER_ID = 'TEST_ISSUER';
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL = 'test@example.com';
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64 = 'dGVzdA==';

      // Re-import to get fresh module state
      const auth = require('@/lib/google-wallet/auth');
      expect(auth.isGoogleWalletConfigured()).toBe(true);
    });

    it('should return false when issuer ID is missing', () => {
      delete process.env.GOOGLE_WALLET_ISSUER_ID;
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL = 'test@example.com';
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64 = 'dGVzdA==';

      const auth = require('@/lib/google-wallet/auth');
      expect(auth.isGoogleWalletConfigured()).toBe(false);
    });

    it('should return false when service account email is missing', () => {
      process.env.GOOGLE_WALLET_ISSUER_ID = 'TEST_ISSUER';
      delete process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64 = 'dGVzdA==';

      const auth = require('@/lib/google-wallet/auth');
      expect(auth.isGoogleWalletConfigured()).toBe(false);
    });

    it('should return false when service account key is missing', () => {
      process.env.GOOGLE_WALLET_ISSUER_ID = 'TEST_ISSUER';
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL = 'test@example.com';
      delete process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64;

      const auth = require('@/lib/google-wallet/auth');
      expect(auth.isGoogleWalletConfigured()).toBe(false);
    });
  });

  describe('getIssuerId', () => {
    it('should return issuer ID from env', () => {
      process.env.GOOGLE_WALLET_ISSUER_ID = 'TEST_ISSUER_123';
      
      const auth = require('@/lib/google-wallet/auth');
      expect(auth.getIssuerId()).toBe('TEST_ISSUER_123');
    });

    it('should throw error when issuer ID is not set', () => {
      delete process.env.GOOGLE_WALLET_ISSUER_ID;
      
      const auth = require('@/lib/google-wallet/auth');
      expect(() => auth.getIssuerId()).toThrow('GOOGLE_WALLET_ISSUER_ID is not configured');
    });
  });

  describe('getClassSuffix', () => {
    it('should return class suffix from env', () => {
      process.env.GOOGLE_WALLET_CLASS_ID = 'loyalty.vigocoffee.com';
      process.env.GOOGLE_WALLET_ISSUER_ID = 'TEST_ISSUER';
      
      const auth = require('@/lib/google-wallet/auth');
      expect(auth.getClassSuffix()).toBe('loyalty.vigocoffee.com');
    });

    it('should extract suffix from full resource ID', () => {
      process.env.GOOGLE_WALLET_CLASS_ID = 'TEST_ISSUER.loyalty.vigocoffee.com';
      process.env.GOOGLE_WALLET_ISSUER_ID = 'TEST_ISSUER';
      
      const auth = require('@/lib/google-wallet/auth');
      expect(auth.getClassSuffix()).toBe('loyalty.vigocoffee.com');
    });

    it('should use default when class ID is not set', () => {
      delete process.env.GOOGLE_WALLET_CLASS_ID;
      process.env.GOOGLE_WALLET_ISSUER_ID = 'TEST_ISSUER';
      
      const auth = require('@/lib/google-wallet/auth');
      expect(auth.getClassSuffix()).toBe('loyaltyvigocoffee');
    });

    it('should sanitize invalid characters', () => {
      process.env.GOOGLE_WALLET_CLASS_ID = 'loyalty@vigocoffee!com';
      process.env.GOOGLE_WALLET_ISSUER_ID = 'TEST_ISSUER';
      
      const auth = require('@/lib/google-wallet/auth');
      const suffix = auth.getClassSuffix();
      expect(suffix).not.toContain('@');
      expect(suffix).not.toContain('!');
    });

    it('should limit length to 50 characters', () => {
      process.env.GOOGLE_WALLET_CLASS_ID = 'a'.repeat(100);
      process.env.GOOGLE_WALLET_ISSUER_ID = 'TEST_ISSUER';
      
      const auth = require('@/lib/google-wallet/auth');
      expect(auth.getClassSuffix().length).toBeLessThanOrEqual(50);
    });

    it('should preserve dots, underscores, and hyphens', () => {
      process.env.GOOGLE_WALLET_CLASS_ID = 'loyalty_vigo-coffee.com';
      process.env.GOOGLE_WALLET_ISSUER_ID = 'TEST_ISSUER';
      
      const auth = require('@/lib/google-wallet/auth');
      const suffix = auth.getClassSuffix();
      expect(suffix).toContain('.');
      expect(suffix).toContain('_');
      expect(suffix).toContain('-');
    });
  });

  describe('getClassId', () => {
    it('should return full class resource ID', () => {
      process.env.GOOGLE_WALLET_ISSUER_ID = 'TEST_ISSUER';
      process.env.GOOGLE_WALLET_CLASS_ID = 'loyaltyvigocoffee';
      
      const auth = require('@/lib/google-wallet/auth');
      expect(auth.getClassId()).toBe('TEST_ISSUER.loyaltyvigocoffee');
    });
  });

  describe('getServiceAccountCredentials', () => {
    it('should return credentials from base64 key', () => {
      const mockKey = {
        client_email: 'test@example.com',
        private_key: 'test-key',
      };
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64 = Buffer.from(
        JSON.stringify(mockKey)
      ).toString('base64');
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL = 'fallback@example.com';

      const auth = require('@/lib/google-wallet/auth');
      const creds = auth.getServiceAccountCredentials();

      expect(creds.client_email).toBe('test@example.com');
      expect(creds.private_key).toBe('test-key');
    });

    it('should use fallback email when key does not have client_email', () => {
      const mockKey = {
        private_key: 'test-key',
      };
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64 = Buffer.from(
        JSON.stringify(mockKey)
      ).toString('base64');
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL = 'fallback@example.com';

      const auth = require('@/lib/google-wallet/auth');
      const creds = auth.getServiceAccountCredentials();

      expect(creds.client_email).toBe('fallback@example.com');
      expect(creds.private_key).toBe('test-key');
    });

    it('should throw error when not configured', () => {
      delete process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64;
      
      const auth = require('@/lib/google-wallet/auth');
      expect(() => auth.getServiceAccountCredentials()).toThrow('Google Wallet is not configured');
    });

    it('should throw error when key is invalid base64', () => {
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64 = 'invalid-base64!!!';
      
      const auth = require('@/lib/google-wallet/auth');
      expect(() => auth.getServiceAccountCredentials()).toThrow();
    });

    it('should throw error when key is invalid JSON', () => {
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64 = Buffer.from('not json').toString('base64');
      
      const auth = require('@/lib/google-wallet/auth');
      expect(() => auth.getServiceAccountCredentials()).toThrow();
    });
  });

  describe('getWalletClient', () => {
    it('should throw error when not configured', () => {
      delete process.env.GOOGLE_WALLET_ISSUER_ID;
      
      const auth = require('@/lib/google-wallet/auth');
      expect(() => auth.getWalletClient()).toThrow('Google Wallet is not configured');
    });

    it('should create and return wallet client', () => {
      const { google } = require('googleapis');
      const mockAuth = { getClient: jest.fn() };
      google.auth.GoogleAuth = jest.fn(() => mockAuth);
      google.walletobjects = jest.fn(() => ({ version: 'v1', auth: mockAuth }));

      const mockKey = {
        client_email: 'test@example.com',
        private_key: 'test-key',
        project_id: 'test-project',
      };
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64 = Buffer.from(
        JSON.stringify(mockKey)
      ).toString('base64');
      process.env.GOOGLE_WALLET_ISSUER_ID = 'TEST_ISSUER';
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL = 'test@example.com';

      const auth = require('@/lib/google-wallet/auth');
      const client = auth.getWalletClient();

      expect(client).toBeDefined();
      expect(google.walletobjects).toHaveBeenCalled();
    });

    it('should return cached client on subsequent calls', () => {
      const { google } = require('googleapis');
      const mockAuth = { getClient: jest.fn() };
      google.auth.GoogleAuth = jest.fn(() => mockAuth);
      google.walletobjects = jest.fn(() => ({ version: 'v1', auth: mockAuth }));

      const mockKey = {
        client_email: 'test@example.com',
        private_key: 'test-key',
        project_id: 'test-project',
      };
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64 = Buffer.from(
        JSON.stringify(mockKey)
      ).toString('base64');
      process.env.GOOGLE_WALLET_ISSUER_ID = 'TEST_ISSUER';
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL = 'test@example.com';

      const auth = require('@/lib/google-wallet/auth');
      const client1 = auth.getWalletClient();
      const client2 = auth.getWalletClient();

      expect(client1).toBe(client2);
      expect(google.walletobjects).toHaveBeenCalledTimes(1);
    });
  });
});

