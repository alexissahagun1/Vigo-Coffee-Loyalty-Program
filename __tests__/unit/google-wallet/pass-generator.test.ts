import { generateGoogleWalletPass, generateAddToWalletJWT, ProfileData } from '@/lib/google-wallet/pass-generator';
import { getClassId, getIssuerId, getServiceAccountCredentials } from '@/lib/google-wallet/auth';
import { calculateRewards } from '@/lib/wallet/shared-pass-data';
import { walletobjects_v1 } from 'googleapis';

// Mock dependencies
jest.mock('@/lib/google-wallet/auth', () => ({
  getClassId: jest.fn(() => 'TEST_ISSUER_ID.loyaltyvigocoffee'),
  getIssuerId: jest.fn(() => 'TEST_ISSUER_ID'),
  getServiceAccountCredentials: jest.fn(() => ({
    client_email: 'test@example.com',
    private_key: '-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----',
  })),
}));

jest.mock('@/lib/wallet/shared-pass-data', () => ({
  calculateRewards: jest.fn(),
}));

jest.mock('@/lib/google-wallet/image-urls', () => ({
  getBaseUrl: jest.fn(() => 'https://example.com'),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn((payload, key, options) => 'mock-jwt-token'),
}));

describe('Google Wallet Pass Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (calculateRewards as jest.Mock).mockReturnValue({
      rewardEarned: false,
      rewardType: null,
      earnedMeal: false,
      earnedCoffee: false,
      rewardMessage: 'No reward yet! Keep shopping, you are almost there!',
      rewardLabel: 'KEEP GOING',
    });
  });

  describe('generateGoogleWalletPass', () => {
    const baseProfile: ProfileData = {
      id: 'user-123',
      full_name: 'John Doe',
      points_balance: 15,
      redeemed_rewards: {
        coffees: [],
        meals: [],
      },
    };

    it('should generate pass with all required fields', async () => {
      const pass = await generateGoogleWalletPass(baseProfile);

      expect(pass.id).toBeDefined();
      expect(pass.classId).toBe('TEST_ISSUER_ID.loyaltyvigocoffee');
      expect(pass.state).toBe('ACTIVE');
      expect(pass.accountName).toBe('John Doe');
      expect(pass.accountId).toBe('user-123');
      expect(pass.loyaltyPoints).toBeDefined();
      expect(pass.barcode).toBeDefined();
      expect(pass.textModulesData).toBeDefined();
    });

    it('should use provided classId override', async () => {
      const pass = await generateGoogleWalletPass(baseProfile, undefined, 'CUSTOM_CLASS_ID');

      expect(pass.classId).toBe('CUSTOM_CLASS_ID');
    });

    it('should use provided objectId override', async () => {
      const pass = await generateGoogleWalletPass(baseProfile, undefined, undefined, 'CUSTOM_OBJECT_ID');

      expect(pass.id).toBe('CUSTOM_OBJECT_ID');
    });

    it('should handle null points_balance', async () => {
      const profile = { ...baseProfile, points_balance: null };
      const pass = await generateGoogleWalletPass(profile);

      expect(pass.loyaltyPoints?.balance?.int).toBe(0);
    });

    it('should handle undefined points_balance', async () => {
      const profile = { ...baseProfile, points_balance: undefined };
      const pass = await generateGoogleWalletPass(profile);

      expect(pass.loyaltyPoints?.balance?.int).toBe(0);
    });

    it('should use email as fallback for accountName', async () => {
      const profile = {
        ...baseProfile,
        full_name: null,
        email: 'john@example.com',
      };
      const pass = await generateGoogleWalletPass(profile);

      expect(pass.accountName).toBe('john@example.com');
    });

    it('should use default name if both full_name and email are missing', async () => {
      const profile = {
        ...baseProfile,
        full_name: null,
        email: null,
      };
      const pass = await generateGoogleWalletPass(profile);

      expect(pass.accountName).toBe('Valued Customer');
    });

    it('should include heroImage when backgroundImageUrl is provided', async () => {
      const imageUrl = 'https://example.com/image.png';
      const pass = await generateGoogleWalletPass(baseProfile, imageUrl);

      expect(pass.heroImage).toBeDefined();
      expect(pass.heroImage?.sourceUri?.uri).toBe(imageUrl);
    });

    it('should not include heroImage when backgroundImageUrl is not provided', async () => {
      const pass = await generateGoogleWalletPass(baseProfile);

      expect(pass.heroImage).toBeUndefined();
    });

    it('should reject invalid heroImage URLs', async () => {
      const invalidUrl = 'not-a-valid-url';
      const pass = await generateGoogleWalletPass(baseProfile, invalidUrl);

      expect(pass.heroImage).toBeUndefined();
    });

    it('should generate correct loyalty points structure', async () => {
      const profile = { ...baseProfile, points_balance: 25 };
      const pass = await generateGoogleWalletPass(profile);

      expect(pass.loyaltyPoints?.balance?.int).toBe(25);
      expect(pass.loyaltyPoints?.label).toBe('Points');
      // Should only have int, not string
      expect(pass.loyaltyPoints?.balance).not.toHaveProperty('string');
    });

    it('should generate correct barcode with user ID', async () => {
      const pass = await generateGoogleWalletPass(baseProfile);

      expect(pass.barcode?.type).toBe('QR_CODE');
      expect(pass.barcode?.value).toBe('user-123');
      expect(pass.barcode?.alternateText).toBe('user-123...');
    });

    it('should include text modules', async () => {
      const pass = await generateGoogleWalletPass(baseProfile);

      expect(pass.textModulesData).toHaveLength(3);
      expect(pass.textModulesData?.find(m => m.id === 'member')).toBeDefined();
      expect(pass.textModulesData?.find(m => m.id === 'reward')).toBeDefined();
      expect(pass.textModulesData?.find(m => m.id === 'rewardStructure')).toBeDefined();
    });

    it('should call calculateRewards with correct parameters', async () => {
      const profile = {
        ...baseProfile,
        points_balance: 25,
        redeemed_rewards: { coffees: [10], meals: [] },
      };
      
      await generateGoogleWalletPass(profile);

      expect(calculateRewards).toHaveBeenCalledWith(25, { coffees: [10], meals: [] });
    });

    it('should handle empty redeemed_rewards', async () => {
      const profile = { ...baseProfile, redeemed_rewards: null };
      const pass = await generateGoogleWalletPass(profile);

      expect(pass).toBeDefined();
      expect(calculateRewards).toHaveBeenCalledWith(15, { coffees: [], meals: [] });
    });

    it('should trim whitespace from names', async () => {
      const profile = { ...baseProfile, full_name: '  John Doe  ' };
      const pass = await generateGoogleWalletPass(profile);

      expect(pass.accountName).toBe('John Doe');
    });
  });

  describe('generateAddToWalletJWT', () => {
    const mockLoyaltyObject: walletobjects_v1.Schema$LoyaltyObject = {
      id: 'TEST_ISSUER_ID.abc123',
      classId: 'TEST_ISSUER_ID.loyaltyvigocoffee',
      state: 'ACTIVE',
    };

    it('should generate JWT token', async () => {
      const jwt = require('jsonwebtoken');
      const token = await generateAddToWalletJWT(mockLoyaltyObject);

      expect(token).toBe('mock-jwt-token');
      expect(jwt.sign).toHaveBeenCalled();
    });

    it('should include correct claims in JWT', async () => {
      const jwt = require('jsonwebtoken');
      await generateAddToWalletJWT(mockLoyaltyObject);

      const callArgs = (jwt.sign as jest.Mock).mock.calls[0];
      const claims = callArgs[0];

      expect(claims.iss).toBe('test@example.com');
      expect(claims.aud).toBe('google');
      expect(claims.typ).toBe('savetowallet');
      expect(claims.payload.loyaltyObjects[0].id).toBe('TEST_ISSUER_ID.abc123');
    });

    it('should handle private key with escaped newlines', async () => {
      const jwt = require('jsonwebtoken');
      (getServiceAccountCredentials as jest.Mock).mockReturnValueOnce({
        client_email: 'test@example.com',
        private_key: '-----BEGIN PRIVATE KEY-----\\nMOCK_KEY\\n-----END PRIVATE KEY-----',
      });

      await generateAddToWalletJWT(mockLoyaltyObject);

      const callArgs = (jwt.sign as jest.Mock).mock.calls[0];
      const privateKey = callArgs[1];
      
      // Should have actual newlines, not escaped
      expect(privateKey).toContain('\n');
      expect(privateKey).not.toContain('\\n');
    });
  });
});

