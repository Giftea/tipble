const sharp = require('sharp')
const path = require('path')

const src = path.join(__dirname, '../src/icons/icon.svg')
const sizes = [16, 48, 128]

Promise.all(
  sizes.map(size =>
    sharp(src)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, `../src/icons/icon${size}.png`))
      .then(() => console.log(`Generated icon${size}.png`))
  )
).catch(err => {
  console.error('Failed to generate icons:', err.message)
  process.exit(1)
})
