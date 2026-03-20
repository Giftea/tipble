const { PNG } = require('pngjs')
const fs = require('fs')
const path = require('path')

const sizes = [16, 48, 128]

const iconsDir = path.join(__dirname, '../src/icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

// Colors
const BG_COLOR = { r: 10, g: 10, b: 10, a: 255 }    // #0a0a0a
const FG_COLOR = { r: 93, g: 202, b: 165, a: 255 }   // #5dcaa5
const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 }

function setPixel(data, width, x, y, color) {
  const idx = (width * y + x) * 4
  data[idx] = color.r
  data[idx + 1] = color.g
  data[idx + 2] = color.b
  data[idx + 3] = color.a
}

function generateIcon(size) {
  const png = new PNG({ width: size, height: size, filterType: -1 })
  const cx = size / 2
  const cy = size / 2
  const r = size / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= r) {
        // Determine if pixel is in the "T" shape
        const nx = (x + 0.5) / size  // normalized 0..1
        const ny = (y + 0.5) / size

        const inTopBar = ny >= 0.2 && ny <= 0.45 && nx >= 0.2 && nx <= 0.8
        const inStem = ny > 0.45 && ny <= 0.82 && nx >= 0.38 && nx <= 0.62

        if (inTopBar || inStem) {
          setPixel(png.data, size, x, y, FG_COLOR)
        } else {
          setPixel(png.data, size, x, y, BG_COLOR)
        }
      } else {
        setPixel(png.data, size, x, y, TRANSPARENT)
      }
    }
  }

  const outPath = path.join(iconsDir, `icon${size}.png`)
  const buffer = PNG.sync.write(png)
  fs.writeFileSync(outPath, buffer)
  console.log(`Generated icon${size}.png`)
}

sizes.forEach(generateIcon)
