import { generateAuthToken, validateAuthToken } from '@/lib/passkit/auth-token';

describe('Auth Token Generation and Validation', () => {
  const testUserId = 'test-user-123';
  const testSecret = 'test-secret-key';

  describe('generateAuthToken', () => {
    it('should generate a token for a given userId', () => {
      const token = generateAuthToken(testUserId);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(32);
    });

    it('should generate consistent tokens for the same userId', () => {
      const token1 = generateAuthToken(testUserId, testSecret);
      const token2 = generateAuthToken(testUserId, testSecret);
      expect(token1).toBe(token2);
    });

    it('should generate different tokens for different userIds', () => {
      const token1 = generateAuthToken('user-1', testSecret);
      const token2 = generateAuthToken('user-2', testSecret);
      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens with different secrets', () => {
      const token1 = generateAuthToken(testUserId, 'secret-1');
      const token2 = generateAuthToken(testUserId, 'secret-2');
      expect(token1).not.toBe(token2);
    });

    it('should generate hex-encoded tokens', () => {
      const token = generateAuthToken(testUserId);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });
  });

  describe('validateAuthToken', () => {
    it('should validate a correctly generated token', () => {
      const token = generateAuthToken(testUserId, testSecret);
      const isValid = validateAuthToken(token, testUserId, testSecret);
      expect(isValid).toBe(true);
    });

    it('should reject an invalid token', () => {
      const isValid = validateAuthToken('invalid-token', testUserId, testSecret);
      expect(isValid).toBe(false);
    });

    it('should reject a token for wrong userId', () => {
      const token = generateAuthToken('user-1', testSecret);
      const isValid = validateAuthToken(token, 'user-2', testSecret);
      expect(isValid).toBe(false);
    });

    it('should reject a token with wrong secret', () => {
      const token = generateAuthToken(testUserId, 'secret-1');
      const isValid = validateAuthToken(token, testUserId, 'secret-2');
      expect(isValid).toBe(false);
    });

    it('should reject tokens that are not 32 characters', () => {
      expect(validateAuthToken('short', testUserId, testSecret)).toBe(false);
      expect(validateAuthToken('a'.repeat(33), testUserId, testSecret)).toBe(false);
    });

    it('should reject non-hex tokens', () => {
      const invalidToken = 'g'.repeat(32); // 'g' is not valid hex
      expect(validateAuthToken(invalidToken, testUserId, testSecret)).toBe(false);
    });
  });
});

