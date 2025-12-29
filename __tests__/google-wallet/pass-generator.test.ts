import { generateGoogleWalletPass, ProfileData } from '@/lib/google-wallet/pass-generator';
import { getClassId } from '@/lib/google-wallet/auth';

// Mock the auth module
jest.mock('@/lib/google-wallet/auth', () => ({
  getClassId: jest.fn(() => 'loyalty.vigocoffee.com'),
  isGoogleWalletConfigured: jest.fn(() => true),
}));

// Mock image URLs
jest.mock('@/lib/google-wallet/image-urls', () => ({
  getImageUrl: jest.fn((path: string) => `https://example.com/${path}`),
  getBaseUrl: jest.fn(() => 'https://example.com'),
}));

describe('Google Wallet Pass Generator', () => {
  const mockProfile: ProfileData = {
    id: 'test-user-id',
    full_name: 'John Doe',
    points_balance: 10,
    redeemed_rewards: {
      coffees: [],
      meals: [],
    },
    email: 'john@example.com',
  };

  it('should generate valid pass JSON', () => {
    const pass = generateGoogleWalletPass(mockProfile);

    expect(pass).toBeDefined();
    expect(pass.id).toBe('test-user-id');
    expect(pass.classId).toBe('loyalty.vigocoffee.com');
    expect(pass.state).toBe('ACTIVE');
  });

  it('should include account name', () => {
    const pass = generateGoogleWalletPass(mockProfile);

    expect(pass.accountName).toBe('John Doe');
    expect(pass.localizedAccountName?.defaultValue?.value).toBe('John Doe');
  });

  it('should include loyalty points', () => {
    const pass = generateGoogleWalletPass(mockProfile);

    expect(pass.loyaltyPoints).toBeDefined();
    expect(pass.loyaltyPoints?.balance?.string).toBe('10 pts');
    expect(pass.loyaltyPoints?.balance?.int).toBe(10);
  });

  it('should include barcode with user ID', () => {
    const pass = generateGoogleWalletPass(mockProfile);

    expect(pass.barcode).toBeDefined();
    expect(pass.barcode?.type).toBe('QR_CODE');
    expect(pass.barcode?.value).toBe('test-user-id');
  });

  it('should include text modules', () => {
    const pass = generateGoogleWalletPass(mockProfile);

    expect(pass.textModulesData).toBeDefined();
    expect(pass.textModulesData?.length).toBeGreaterThan(0);
    
    const memberModule = pass.textModulesData?.find(m => m.id === 'member');
    expect(memberModule).toBeDefined();
    expect(memberModule?.body).toBe('John Doe');
  });

  it('should handle missing full_name', () => {
    const profileWithoutName: ProfileData = {
      id: 'test-user-id',
      points_balance: 5,
    };

    const pass = generateGoogleWalletPass(profileWithoutName);

    expect(pass.accountName).toBe('Valued Customer');
  });

  it('should handle zero points', () => {
    const profileZeroPoints: ProfileData = {
      id: 'test-user-id',
      full_name: 'Jane Doe',
      points_balance: 0,
    };

    const pass = generateGoogleWalletPass(profileZeroPoints);

    expect(pass.loyaltyPoints?.balance?.string).toBe('0 pts');
    expect(pass.loyaltyPoints?.balance?.int).toBe(0);
  });

  it('should include reward message when reward is earned', () => {
    const profileWithReward: ProfileData = {
      id: 'test-user-id',
      full_name: 'John Doe',
      points_balance: 10, // Coffee reward threshold
      redeemed_rewards: {
        coffees: [],
        meals: [],
      },
    };

    const pass = generateGoogleWalletPass(profileWithReward);

    const rewardModule = pass.textModulesData?.find(m => m.id === 'reward');
    expect(rewardModule).toBeDefined();
    expect(rewardModule?.body).toContain('FREE COFFEE');
  });

  it('should include background image URL if provided', () => {
    const backgroundUrl = 'https://example.com/background.png';
    const pass = generateGoogleWalletPass(mockProfile, backgroundUrl);

    expect(pass.imageModulesData).toBeDefined();
    const backgroundModule = pass.imageModulesData?.find(m => m.id === 'background');
    expect(backgroundModule).toBeDefined();
    expect(backgroundModule?.mainImage?.sourceUri?.uri).toBe(backgroundUrl);
  });
});

