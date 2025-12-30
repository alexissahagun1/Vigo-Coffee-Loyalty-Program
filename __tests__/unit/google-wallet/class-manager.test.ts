import { ensureLoyaltyClassExists, listLoyaltyClasses, updateLoyaltyClass } from '@/lib/google-wallet/class-manager';
import { getWalletClient, isGoogleWalletConfigured, getIssuerId, getClassId } from '@/lib/google-wallet/auth';
import { walletobjects_v1 } from 'googleapis';

// Mock the auth module
jest.mock('@/lib/google-wallet/auth', () => ({
  getWalletClient: jest.fn(),
  isGoogleWalletConfigured: jest.fn(() => true),
  getIssuerId: jest.fn(() => 'TEST_ISSUER_ID'),
  getClassId: jest.fn(() => 'TEST_ISSUER_ID.loyaltyvigocoffee'),
  getClassSuffix: jest.fn(() => 'loyaltyvigocoffee'),
}));

describe('Google Wallet Class Manager', () => {
  let mockWallet: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockWallet = {
      loyaltyclass: {
        get: jest.fn(),
        insert: jest.fn(),
        patch: jest.fn(),
        update: jest.fn(),
        list: jest.fn(),
      },
    };
    
    (getWalletClient as jest.Mock).mockReturnValue(mockWallet);
  });

  describe('listLoyaltyClasses', () => {
    it('should return empty array if Google Wallet is not configured', async () => {
      (isGoogleWalletConfigured as jest.Mock).mockReturnValue(false);
      
      await expect(listLoyaltyClasses()).rejects.toThrow('Google Wallet is not configured');
    });

    it('should return list of class IDs when successful', async () => {
      mockWallet.loyaltyclass.list.mockResolvedValue({
        data: {
          resources: [
            { id: 'TEST_ISSUER_ID.class1' },
            { id: 'TEST_ISSUER_ID.class2' },
          ],
        },
      });

      const result = await listLoyaltyClasses();
      
      expect(result).toEqual(['TEST_ISSUER_ID.class1', 'TEST_ISSUER_ID.class2']);
      expect(mockWallet.loyaltyclass.list).toHaveBeenCalledWith({});
    });

    it('should return empty array on error', async () => {
      mockWallet.loyaltyclass.list.mockRejectedValue(new Error('API Error'));

      const result = await listLoyaltyClasses();
      
      expect(result).toEqual([]);
    });
  });

  describe('ensureLoyaltyClassExists', () => {
    const baseUrl = 'https://example.com';

    it('should throw error if Google Wallet is not configured', async () => {
      (isGoogleWalletConfigured as jest.Mock).mockReturnValue(false);
      
      await expect(ensureLoyaltyClassExists(baseUrl)).rejects.toThrow('Google Wallet is not configured');
    });

    it('should return existing class ID if class already exists', async () => {
      const existingClass = {
        id: 'TEST_ISSUER_ID.loyaltyvigocoffee',
        hexBackgroundColor: '#000000',
        reviewStatus: 'APPROVED',
      };
      
      mockWallet.loyaltyclass.get.mockResolvedValue({
        data: existingClass,
      });

      const result = await ensureLoyaltyClassExists(baseUrl);
      
      expect(result).toBe('TEST_ISSUER_ID.loyaltyvigocoffee');
      expect(mockWallet.loyaltyclass.get).toHaveBeenCalledWith({
        resourceId: 'TEST_ISSUER_ID.loyaltyvigocoffee',
      });
    });

    it('should create new class if it does not exist (404)', async () => {
      // First call (get) returns 404
      mockWallet.loyaltyclass.get.mockRejectedValue({
        code: 404,
        message: 'Not found',
      });
      
      // Second call (insert) succeeds
      mockWallet.loyaltyclass.insert.mockResolvedValue({
        data: { id: 'TEST_ISSUER_ID.loyaltyvigocoffee' },
      });

      const result = await ensureLoyaltyClassExists(baseUrl);
      
      expect(result).toBe('TEST_ISSUER_ID.loyaltyvigocoffee');
      expect(mockWallet.loyaltyclass.insert).toHaveBeenCalled();
    });

    it('should handle 400 error (class exists in console)', async () => {
      mockWallet.loyaltyclass.get.mockRejectedValue({
        code: 400,
        message: 'Invalid resource ID',
      });

      const result = await ensureLoyaltyClassExists(baseUrl);
      
      expect(result).toBe('TEST_ISSUER_ID.loyaltyvigocoffee');
    });

    it('should handle 403 error (permission denied)', async () => {
      mockWallet.loyaltyclass.get.mockRejectedValue({
        code: 403,
        message: 'Permission denied',
      });

      const result = await ensureLoyaltyClassExists(baseUrl);
      
      expect(result).toBe('TEST_ISSUER_ID.loyaltyvigocoffee');
    });

    it('should handle 409 conflict (class already exists)', async () => {
      mockWallet.loyaltyclass.get.mockRejectedValue({
        code: 404,
        message: 'Not found',
      });
      
      mockWallet.loyaltyclass.insert.mockRejectedValue({
        code: 409,
        message: 'already exists',
      });

      const result = await ensureLoyaltyClassExists(baseUrl);
      
      expect(result).toBe('TEST_ISSUER_ID.loyaltyvigocoffee');
    });

    it('should update background color if not black', async () => {
      const existingClass = {
        id: 'TEST_ISSUER_ID.loyaltyvigocoffee',
        hexBackgroundColor: '#FF0000',
        reviewStatus: 'DRAFT',
      };
      
      mockWallet.loyaltyclass.get
        .mockResolvedValueOnce({ data: existingClass }) // First get for check
        .mockResolvedValueOnce({ data: { ...existingClass, hexBackgroundColor: '#000000' } }); // Verify after update
      
      mockWallet.loyaltyclass.patch.mockResolvedValue({});

      await ensureLoyaltyClassExists(baseUrl);
      
      expect(mockWallet.loyaltyclass.patch).toHaveBeenCalledWith({
        resourceId: 'TEST_ISSUER_ID.loyaltyvigocoffee',
        requestBody: {
          hexBackgroundColor: '#000000',
        },
      });
    });

    it('should not update background color if class is APPROVED', async () => {
      const existingClass = {
        id: 'TEST_ISSUER_ID.loyaltyvigocoffee',
        hexBackgroundColor: '#FF0000',
        reviewStatus: 'APPROVED',
      };
      
      mockWallet.loyaltyclass.get.mockResolvedValue({
        data: existingClass,
      });

      await ensureLoyaltyClassExists(baseUrl);
      
      // Should not call patch or update for approved classes
      expect(mockWallet.loyaltyclass.patch).not.toHaveBeenCalled();
      expect(mockWallet.loyaltyclass.update).not.toHaveBeenCalled();
    });

    it('should use UPDATE method if PATCH fails', async () => {
      const existingClass = {
        id: 'TEST_ISSUER_ID.loyaltyvigocoffee',
        hexBackgroundColor: '#FF0000',
        reviewStatus: 'DRAFT',
        issuerName: 'Vigo Coffee',
        programName: 'Loyalty Program',
      };
      
      mockWallet.loyaltyclass.get
        .mockResolvedValueOnce({ data: existingClass })
        .mockResolvedValueOnce({ data: { ...existingClass, hexBackgroundColor: '#000000' } });
      
      mockWallet.loyaltyclass.patch.mockRejectedValue(new Error('PATCH failed'));
      mockWallet.loyaltyclass.update.mockResolvedValue({});

      await ensureLoyaltyClassExists(baseUrl);
      
      expect(mockWallet.loyaltyclass.update).toHaveBeenCalled();
    });
  });

  describe('updateLoyaltyClass', () => {
    const baseUrl = 'https://example.com';

    it('should throw error if Google Wallet is not configured', async () => {
      (isGoogleWalletConfigured as jest.Mock).mockReturnValue(false);
      
      await expect(updateLoyaltyClass(baseUrl)).rejects.toThrow('Google Wallet is not configured');
    });

    it('should update class successfully', async () => {
      mockWallet.loyaltyclass.patch.mockResolvedValue({});

      await updateLoyaltyClass(baseUrl);
      
      expect(mockWallet.loyaltyclass.patch).toHaveBeenCalledWith({
        resourceId: 'TEST_ISSUER_ID.loyaltyvigocoffee',
        requestBody: expect.objectContaining({
          hexBackgroundColor: '#000000',
          issuerName: 'Vigo Coffee',
        }),
      });
    });

    it('should throw error on update failure', async () => {
      mockWallet.loyaltyclass.patch.mockRejectedValue(new Error('Update failed'));

      await expect(updateLoyaltyClass(baseUrl)).rejects.toThrow('Failed to update loyalty class');
    });
  });
});

