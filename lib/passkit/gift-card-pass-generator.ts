import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

// Apple Wallet storeCard background dimensions
const BACKGROUND_WIDTH = 390;
const BACKGROUND_HEIGHT = 234;

/**
 * Generates a simple background image for gift card passes (no tigers)
 * @param balanceMxn - Current balance in MXN
 * @param logoBuffer - Logo image buffer
 * @returns PNG buffer of the generated background image
 */
export async function generateGiftCardBackground(
  balanceMxn: number,
  logoBuffer: Buffer
): Promise<Buffer> {
  // Create a simple gradient background (black top, white bottom)
  const topSectionHeight = Math.floor(BACKGROUND_HEIGHT * 0.6);
  const bottomSectionHeight = BACKGROUND_HEIGHT - topSectionHeight;

  // Top section (black background)
  const topSection = sharp({
    create: {
      width: BACKGROUND_WIDTH,
      height: topSectionHeight,
      channels: 4, // RGBA
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  }).png();

  // Bottom section (white background)
  const bottomSection = sharp({
    create: {
      width: BACKGROUND_WIDTH,
      height: bottomSectionHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  }).png();

  // Add logo to top section (centered)
  const logoSize = 80;
  const resizedLogo = await sharp(logoBuffer)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  const logoX = (BACKGROUND_WIDTH - logoSize) / 2;
  const logoY = (topSectionHeight - logoSize) / 2;

  const topWithLogo = await topSection
    .composite([{
      input: resizedLogo,
      left: Math.floor(logoX),
      top: Math.floor(logoY)
    }])
    .png()
    .toBuffer();

  // Create SVG for bottom section with balance display
  const balanceY = bottomSectionHeight * 0.4;
  const balanceText = `$${balanceMxn.toFixed(2)}`;
  
  const svgOverlay = `
    <svg width="${BACKGROUND_WIDTH}" height="${bottomSectionHeight}">
      <!-- Balance display -->
      <text 
        x="${BACKGROUND_WIDTH / 2}" 
        y="${balanceY}" 
        font-family="Arial, sans-serif" 
        font-size="48" 
        font-weight="bold" 
        fill="#000000" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >${balanceText}</text>
      
      <!-- MXN label -->
      <text 
        x="${BACKGROUND_WIDTH / 2}" 
        y="${balanceY + 30}" 
        font-family="Arial, sans-serif" 
        font-size="16" 
        fill="#666666" 
        text-anchor="middle"
      >MXN</text>
    </svg>
  `;

  const svgBuffer = Buffer.from(svgOverlay);

  const bottomWithText = await bottomSection
    .composite([{
      input: svgBuffer,
      left: 0,
      top: 0
    }])
    .png()
    .toBuffer();

  // Combine top and bottom sections
  const finalImage = await sharp({
    create: {
      width: BACKGROUND_WIDTH,
      height: BACKGROUND_HEIGHT,
      channels: 4, // RGBA
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  })
    .composite([
      {
        input: topWithLogo,
        left: 0,
        top: 0
      },
      {
        input: bottomWithText,
        left: 0,
        top: topSectionHeight
      }
    ])
    .png({ 
      quality: 100,
      compressionLevel: 6
    })
    .toBuffer();

  return finalImage;
}
