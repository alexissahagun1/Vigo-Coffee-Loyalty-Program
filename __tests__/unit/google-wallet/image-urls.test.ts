import { getBaseUrl, isPublicUrl, getImageUrl, getWalletImageUrls, bufferToDataUrl } from '@/lib/google-wallet/image-urls';

describe('Google Wallet Image URLs', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getBaseUrl', () => {
    it('should return NEXT_PUBLIC_APP_URL when set', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
      delete process.env.VERCEL_URL;

      const url = getBaseUrl();
      expect(url).toBe('https://example.com');
    });

    it('should return VERCEL_URL when NEXT_PUBLIC_APP_URL is not set', () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      process.env.VERCEL_URL = 'myapp.vercel.app';

      const url = getBaseUrl();
      expect(url).toBe('https://myapp.vercel.app');
    });

    it('should return localhost when neither is set', () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.VERCEL_URL;

      const url = getBaseUrl();
      expect(url).toBe('http://localhost:3000');
    });

    it('should add https:// when protocol is missing', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'example.com';
      delete process.env.VERCEL_URL;

      const url = getBaseUrl();
      expect(url).toBe('https://example.com');
    });

    it('should preserve http:// for localhost', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
      delete process.env.VERCEL_URL;

      const url = getBaseUrl();
      expect(url).toBe('http://localhost:3000');
    });

    it('should not add protocol if already present', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
      delete process.env.VERCEL_URL;

      const url = getBaseUrl();
      expect(url).toBe('https://example.com');
    });
  });

  describe('isPublicUrl', () => {
    it('should return true for public URLs', () => {
      expect(isPublicUrl('https://example.com')).toBe(true);
      expect(isPublicUrl('http://example.com')).toBe(true);
      expect(isPublicUrl('https://myapp.vercel.app')).toBe(true);
    });

    it('should return false for localhost', () => {
      expect(isPublicUrl('http://localhost:3000')).toBe(false);
      expect(isPublicUrl('https://localhost:3000')).toBe(false);
    });

    it('should return false for 127.0.0.1', () => {
      expect(isPublicUrl('http://127.0.0.1:3000')).toBe(false);
      expect(isPublicUrl('https://127.0.0.1:3000')).toBe(false);
    });

    it('should return false for URLs containing localhost', () => {
      expect(isPublicUrl('https://localhost.example.com')).toBe(false);
    });

    it('should return false for URLs containing 127.0.0.1', () => {
      expect(isPublicUrl('https://127.0.0.1.example.com')).toBe(false);
    });
  });

  describe('getImageUrl', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
    });

    it('should return full URL for image path', () => {
      const url = getImageUrl('logo.png');
      expect(url).toBe('https://example.com/logo.png');
    });

    it('should handle path with leading slash', () => {
      const url = getImageUrl('/logo.png');
      expect(url).toBe('https://example.com/logo.png');
    });

    it('should handle nested paths', () => {
      const url = getImageUrl('assets/images/logo.png');
      expect(url).toBe('https://example.com/assets/images/logo.png');
    });

    it('should not create double slashes', () => {
      const url = getImageUrl('/logo.png');
      expect(url).not.toContain('//');
      expect(url).toBe('https://example.com/logo.png');
    });
  });

  describe('getWalletImageUrls', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
    });

    it('should return all required image URLs', () => {
      const urls = getWalletImageUrls();

      expect(urls.logo).toBe('https://example.com/logo.png');
      expect(urls.hero).toBe('https://example.com/tiger-red.png');
      expect(urls.background).toBe('https://example.com/logo.png');
    });

    it('should use correct base URL', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://custom-domain.com';
      const urls = getWalletImageUrls();

      expect(urls.logo).toContain('custom-domain.com');
    });
  });

  describe('bufferToDataUrl', () => {
    it('should convert buffer to data URL', () => {
      const buffer = Buffer.from('test image data');
      const dataUrl = bufferToDataUrl(buffer);

      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
      expect(dataUrl.length).toBeGreaterThan(20);
    });

    it('should use custom MIME type', () => {
      const buffer = Buffer.from('test image data');
      const dataUrl = bufferToDataUrl(buffer, 'image/jpeg');

      expect(dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.from('');
      const dataUrl = bufferToDataUrl(buffer);

      expect(dataUrl).toBe('data:image/png;base64,');
    });

    it('should encode buffer correctly', () => {
      const buffer = Buffer.from('Hello World');
      const dataUrl = bufferToDataUrl(buffer);
      const base64Part = dataUrl.split(',')[1];
      const decoded = Buffer.from(base64Part, 'base64').toString();

      expect(decoded).toBe('Hello World');
    });
  });
});

