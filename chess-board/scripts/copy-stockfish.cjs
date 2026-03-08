const fs = require('fs')
const path = require('path')

const srcDir = path.join(__dirname, '..', 'node_modules', 'stockfish', 'bin')
const destDir = path.join(__dirname, '..', 'public', 'stockfish')
const files = ['stockfish-18-lite-single.js', 'stockfish-18-lite-single.wasm']

if (!fs.existsSync(srcDir)) {
  console.warn('stockfish bin not found; run npm install first')
  process.exit(0)
}

fs.mkdirSync(destDir, { recursive: true })
for (const file of files) {
  const src = path.join(srcDir, file)
  const dest = path.join(destDir, file)
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest)
    console.log('Copied', file, 'to public/stockfish/')
  }
}
