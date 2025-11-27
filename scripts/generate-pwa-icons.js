#!/usr/bin/env node

/**
 * PWA Icon Generator
 * 
 * Generates PNG icons from SVG for PWA manifest.
 * Requires: sharp (npm install sharp)
 * 
 * Usage: node scripts/generate-pwa-icons.js
 */

const fs = require('fs')
const path = require('path')

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const ICONS_DIR = path.join(__dirname, '../public/icons')
const SVG_SOURCE = path.join(ICONS_DIR, 'icon.svg')

// Check if sharp is available
let sharp
try {
  sharp = require('sharp')
} catch (e) {
  console.log('⚠️  Sharp não instalado. Gerando ícones placeholder...')
  generatePlaceholderIcons()
  process.exit(0)
}

async function generateIcons() {
  // Ensure directory exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true })
  }

  // Check if SVG exists
  if (!fs.existsSync(SVG_SOURCE)) {
    console.error('❌ SVG source not found:', SVG_SOURCE)
    process.exit(1)
  }

  const svgBuffer = fs.readFileSync(SVG_SOURCE)

  console.log('🎨 Gerando ícones PWA...\n')

  for (const size of ICON_SIZES) {
    const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`)
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath)
    
    console.log(`  ✅ icon-${size}x${size}.png`)
  }

  // Generate Apple Touch Icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'))
  
  console.log('  ✅ apple-touch-icon.png')

  // Generate maskable icon (512x512 with padding)
  await sharp(svgBuffer)
    .resize(410, 410) // Smaller to add safe zone padding
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: { r: 16, g: 185, b: 129, alpha: 1 } // #10b981
    })
    .png()
    .toFile(path.join(ICONS_DIR, 'maskable-icon-512x512.png'))
  
  console.log('  ✅ maskable-icon-512x512.png')

  console.log('\n✨ Todos os ícones gerados com sucesso!')
}

function generatePlaceholderIcons() {
  // Generate simple placeholder icons without sharp
  const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 SIZE SIZE">
    <rect width="SIZE" height="SIZE" rx="RADIUS" fill="#10b981"/>
    <rect x="CROSS_X" y="CROSS_Y1" width="CROSS_W" height="CROSS_H" rx="4" fill="white"/>
    <rect x="CROSS_Y1" y="CROSS_X" width="CROSS_H" height="CROSS_W" rx="4" fill="white"/>
  </svg>`

  console.log('📝 Criando ícones SVG placeholder...\n')

  for (const size of ICON_SIZES) {
    const radius = Math.round(size * 0.1875) // ~18.75% corner radius
    const crossW = Math.round(size * 0.125)
    const crossH = Math.round(size * 0.5)
    const crossX = Math.round((size - crossW) / 2)
    const crossY1 = Math.round((size - crossH) / 2)

    const svg = placeholderSvg
      .replace(/SIZE/g, size)
      .replace(/RADIUS/g, radius)
      .replace(/CROSS_W/g, crossW)
      .replace(/CROSS_H/g, crossH)
      .replace(/CROSS_X/g, crossX)
      .replace(/CROSS_Y1/g, crossY1)

    const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.svg`)
    fs.writeFileSync(outputPath, svg)
    console.log(`  ✅ icon-${size}x${size}.svg`)
  }

  console.log('\n⚠️  Ícones SVG criados. Para PNG, instale sharp: npm install sharp')
}

generateIcons().catch(console.error)
