import sharp from 'sharp';

// Apple Wallet storeCard background dimensions
// Using standard wallet card dimensions
const BACKGROUND_WIDTH = 390;
const BACKGROUND_HEIGHT = 234;
const TOTAL_STAMPS = 10;
const STAMPS_PER_ROW = 5;
const STAMPS_PER_COLUMN = 2;

/**
 * Generates a dynamic background image for the Apple Wallet loyalty card
 * @param pointsBalance - Current points balance
 * @param logoBuffer - Logo image buffer
 * @param redTigerBuffer - Red tiger icon buffer (collected stamps)
 * @param whiteTigerBuffer - White tiger icon buffer (uncollected stamps)
 * @returns PNG buffer of the generated background image
 */
export async function generateLoyaltyCardBackground(
  pointsBalance: number,
  logoBuffer: Buffer,
  redTigerBuffer: Buffer,
  whiteTigerBuffer: Buffer
): Promise<Buffer> {
  // Calculate stamp progress
  // When pointsBalance is 10, 20, 30, etc., we want to show 10 red tigers (not 0)
  const currentPoints = pointsBalance % 10 === 0 && pointsBalance > 0 ? 10 : pointsBalance % 10;
  const stampsRemaining = 10 - currentPoints;

  // Top section (black background) - adjust to avoid overlap with balance field
  // Apple Wallet places primaryFields at top, so we'll position tigers lower
  const topSectionHeight = Math.floor(BACKGROUND_HEIGHT * 0.7);
  const bottomSectionHeight = BACKGROUND_HEIGHT - topSectionHeight;

  // Create top section (black background) - use RGBA to support alpha compositing
  const topSection = sharp({
    create: {
      width: BACKGROUND_WIDTH,
      height: topSectionHeight,
      channels: 4, // RGBA to support alpha compositing
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  }).png();

  // Create bottom section (white background)
  const bottomSection = sharp({
    create: {
      width: BACKGROUND_WIDTH,
      height: bottomSectionHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  }).png();

  // Don't add logo to background - it's already in the pass as a separate logo image
  // This prevents duplicate logos from appearing
  const topWithLogo = await topSection
    .png()
    .toBuffer();

  // Tiger grid positioning - start lower to avoid headerFields area (top right)
  const gridStartY = 20; // Start lower to avoid header area
  const gridBottomPadding = 25; // More bottom padding to ensure tigers don't go outside
  const availableHeight = topSectionHeight - gridStartY - gridBottomPadding;
  const gridHeight = availableHeight;
  const gridWidth = BACKGROUND_WIDTH - 40; // More side padding (20px each side) to keep tigers well inside
  const cellWidth = gridWidth / STAMPS_PER_ROW;
  const cellHeight = gridHeight / STAMPS_PER_COLUMN;
  
  // Tiger icon size - make them much smaller to ensure they fit within card bounds
  const minTigerSize = 25; // Even smaller minimum
  const maxTigerSize = 40; // Much smaller maximum to prevent overflow
  // Use 65% of cell space to ensure tigers stay well within bounds
  const calculatedTigerSize = Math.min(cellWidth * 0.65, cellHeight * 0.65, maxTigerSize);
  const tigerSize = Math.max(calculatedTigerSize, minTigerSize);
  const tigerPadding = (Math.min(cellWidth, cellHeight) - tigerSize) / 2;

  // Debug logging
  console.log('🐅 Tiger Grid Debug:', {
    topSectionHeight,
    gridStartY,
    gridHeight,
    cellWidth,
    cellHeight,
    tigerSize,
    currentPoints
  });

  // Validate tiger images before processing
  try {
    const redTigerMetadata = await sharp(redTigerBuffer).metadata();
    const whiteTigerMetadata = await sharp(whiteTigerBuffer).metadata();
    console.log('🐅 Tiger Image Metadata:', {
      redTiger: { width: redTigerMetadata.width, height: redTigerMetadata.height, format: redTigerMetadata.format },
      whiteTiger: { width: whiteTigerMetadata.width, height: whiteTigerMetadata.height, format: whiteTigerMetadata.format },
      targetSize: tigerSize
    });
  } catch (error) {
    console.error('❌ Error validating tiger images:', error);
    throw new Error('Failed to validate tiger images');
  }

  // Resize tiger images - ensure RGBA channels are preserved
  const resizedRedTiger = await sharp(redTigerBuffer)
    .resize(Math.floor(tigerSize), Math.floor(tigerSize), { 
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
    })
    .ensureAlpha() // Ensure alpha channel exists
    .png()
    .toBuffer();

  const resizedWhiteTiger = await sharp(whiteTigerBuffer)
    .resize(Math.floor(tigerSize), Math.floor(tigerSize), { 
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
    })
    .ensureAlpha() // Ensure alpha channel exists
    .png()
    .toBuffer();

  console.log('✅ Tiger images resized successfully');

  // Prepare composites for tigers
  const tigerComposites: sharp.OverlayOptions[] = [];

  // Draw 10-tiger grid (2 rows × 5 columns)
  for (let row = 0; row < STAMPS_PER_COLUMN; row++) {
    for (let col = 0; col < STAMPS_PER_ROW; col++) {
      const position = row * STAMPS_PER_ROW + col + 1; // 1-indexed
      const cellX = 20 + col * cellWidth + tigerPadding;
      const cellY = gridStartY + row * cellHeight + tigerPadding;

      // Ensure tigers are within bounds
      const finalX = Math.max(0, Math.min(Math.floor(cellX), BACKGROUND_WIDTH - tigerSize));
      const finalY = Math.max(0, Math.min(Math.floor(cellY), topSectionHeight - tigerSize));

      // Determine if stamp is collected (red) or not (white)
      if (position <= currentPoints) {
        // Add red tiger (collected)
        tigerComposites.push({
          input: resizedRedTiger,
          left: finalX,
          top: finalY
        });
      } else {
        // Add white tiger (uncollected)
        tigerComposites.push({
          input: resizedWhiteTiger,
          left: finalX,
          top: finalY
        });
      }
    }
  }

  console.log(`✅ Added ${tigerComposites.length} tigers to composite (${currentPoints} red, ${10 - currentPoints} white)`);

  // Composite all tigers onto top section
  if (tigerComposites.length === 0) {
    console.error('❌ No tiger composites to add!');
    throw new Error('No tiger composites generated');
  }

  console.log('🐅 Composites to apply:', tigerComposites.length);
  tigerComposites.forEach((comp, idx) => {
    console.log(`  Tiger ${idx + 1}: left=${comp.left}, top=${comp.top}`);
  });

  const topWithTigers = await sharp(topWithLogo)
    .composite(tigerComposites)
    .png()
    .toBuffer();

  console.log('✅ Tigers composited onto top section');

  // Create SVG for bottom section text and shapes (coordinates relative to bottom section)
  const numberY = bottomSectionHeight * 0.25;
  const barcodeY = bottomSectionHeight * 0.5;
  const barcodeHeight = 40;
  const barcodeWidth = BACKGROUND_WIDTH * 0.7;
  const barcodeX = (BACKGROUND_WIDTH - barcodeWidth) / 2;
  const tapTextY = barcodeY + barcodeHeight + 15;

  const svgOverlay = `
    <svg width="${BACKGROUND_WIDTH}" height="${bottomSectionHeight}">
      <!-- Large number showing remaining stamps -->
      <text 
        x="${BACKGROUND_WIDTH / 2}" 
        y="${numberY}" 
        font-family="Arial, sans-serif" 
        font-size="70" 
        font-weight="bold" 
        fill="#000000" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >${stampsRemaining}</text>
      
      <!-- Barcode placeholder rectangle -->
      <rect 
        x="${barcodeX}" 
        y="${barcodeY}" 
        width="${barcodeWidth}" 
        height="${barcodeHeight}" 
        fill="none" 
        stroke="#CCCCCC" 
        stroke-width="1"
      />
      
      <!-- "Tap ... for details" text -->
      <text 
        x="${BACKGROUND_WIDTH / 2}" 
        y="${tapTextY}" 
        font-family="Arial, sans-serif" 
        font-size="13" 
        fill="#666666" 
        text-anchor="middle"
      >Tap ... for details</text>
    </svg>
  `;

  const svgBuffer = Buffer.from(svgOverlay);

  // Composite SVG onto bottom section
  const bottomWithText = await bottomSection
    .composite([{
      input: svgBuffer,
      left: 0,
      top: 0
    }])
    .png()
    .toBuffer();

  // Combine top and bottom sections into final image
  // Use RGBA to ensure proper image composition
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
        input: topWithTigers,
        left: 0,
        top: 0
      },
      {
        input: bottomWithText,
        left: 0,
        top: topSectionHeight
      }
    ])
    .png()
    .toBuffer();

  // Validate final image
  const finalMetadata = await sharp(finalImage).metadata();
  console.log('✅ Final background image generated:', {
    width: finalMetadata.width,
    height: finalMetadata.height,
    format: finalMetadata.format,
    channels: finalMetadata.channels,
    size: finalImage.length
  });

  return finalImage;
}
