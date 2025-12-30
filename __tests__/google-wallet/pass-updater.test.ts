import { updateGoogleWalletPass, hasGoogleWalletPass } from '@/lib/google-wallet/pass-updater';
import { getWalletClient, isGoogleWalletConfigured } from '@/lib/google-wallet/auth';
import { ProfileData } from '@/lib/google-wallet/pass-generator';

// Mock the auth module
jest.mock('@/lib/google-wallet/auth', () => ({
  getWalletClient: jest.fn(),
  isGoogleWalletConfigured: jest.fn(() => true),
  getClassId: jest.fn(() => 'loyalty.vigocoffee.com'),
}));

// Mock pass generator
jest.mock('@/lib/google-wallet/pass-generator', () => ({
  generateGoogleWalletPass: jest.fn((profile: ProfileData) => ({
    id: profile.id,
    classId: 'loyalty.vigocoffee.com',
    loyaltyPoints: {
      balance: {
        string: `${profile.points_balance || 0} pts`,
        int: profile.points_balance || 0,
      },
    },
  })),
}));

describe('Google Wallet Pass Updater', () => {
  const mockProfile: ProfileData = {
    id: 'test-user-id',
    full_name: 'John Doe',
    points_balance: 15,
    redeemed_rewards: {
      coffees: [],
      meals: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false if Google Wallet is not configured', async () => {
    (isGoogleWalletConfigured as jest.Mock).mockReturnValue(false);

    const result = await updateGoogleWalletPass('test-user-id', mockProfile);

    expect(result).toBe(false);
  });

  it('should update pass successfully when pass exists', async () => {
    const mockWallet = {
      loyaltyobject: {
        get: jest.fn().mockResolvedValue({
          data: { id: 'test-user-id' },
        }),
        patch: jest.fn().mockResolvedValue({}),
      },
    };

    (getWalletClient as jest.Mock).mockReturnValue(mockWallet);

    const result = await updateGoogleWalletPass('test-user-id', mockProfile);

    expect(result).toBe(true);
    expect(mockWallet.loyaltyobject.get).toHaveBeenCalledWith({
      resourceId: 'test-user-id',
    });
    expect(mockWallet.loyaltyobject.patch).toHaveBeenCalled();
  });

  it('should return false when pass does not exist', async () => {
    const mockWallet = {
      loyaltyobject: {
        get: jest.fn().mockRejectedValue({
          code: 404,
          message: 'Not found',
        }),
      },
    };

    (getWalletClient as jest.Mock).mockReturnValue(mockWallet);

    const result = await updateGoogleWalletPass('test-user-id', mockProfile);

    expect(result).toBe(false);
    expect(mockWallet.loyaltyobject.get).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const mockWallet = {
      loyaltyobject: {
        get: jest.fn().mockRejectedValue({
          code: 500,
          message: 'Internal server error',
        }),
      },
    };

    (getWalletClient as jest.Mock).mockReturnValue(mockWallet);

    const result = await updateGoogleWalletPass('test-user-id', mockProfile);

    expect(result).toBe(false);
  });

  describe('hasGoogleWalletPass', () => {
    it('should return true if pass exists', async () => {
      const mockWallet = {
        loyaltyobject: {
          get: jest.fn().mockResolvedValue({
            data: { id: 'test-user-id' },
          }),
        },
      };

      (getWalletClient as jest.Mock).mockReturnValue(mockWallet);

      const result = await hasGoogleWalletPass('test-user-id');

      expect(result).toBe(true);
    });

    it('should return false if pass does not exist', async () => {
      const mockWallet = {
        loyaltyobject: {
          get: jest.fn().mockRejectedValue({
            code: 404,
          }),
        },
      };

      (getWalletClient as jest.Mock).mockReturnValue(mockWallet);

      const result = await hasGoogleWalletPass('test-user-id');

      expect(result).toBe(false);
    });

    it('should return false if Google Wallet is not configured', async () => {
      (isGoogleWalletConfigured as jest.Mock).mockReturnValue(false);

      const result = await hasGoogleWalletPass('test-user-id');

      expect(result).toBe(false);
    });
  });
});

