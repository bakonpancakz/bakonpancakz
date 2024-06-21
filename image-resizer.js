const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const extAllowlist = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.svg',
    '.webp'
])

/**
 * Simple script to resize all images and icons
 * @param {string} directory - Input Directory
 * @param {number} height - Desired Image Height
 * @param {number?} width - Desired Image Width 
 */
function ProcessDirectory(directory, height, width = undefined) {
    console.log(`\n--- ${directory} ---`)
    for (const filename of fs.readdirSync(directory)) {
        // Silent Ignore
        if (filename.endsWith('.min.png')) continue
        // Ignore Unknown Extension
        if (!extAllowlist.has(path.extname(filename))) {
            console.log(`Skipping file: ${filename}`)
            continue
        }

        // Process Image
        const inPath = path.join(directory, filename)
        const outPath = path.join('images', filename.slice(0, -path.extname(filename).length) + '.min.png')
        sharp(inPath)
            .resize(height, width, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png({ compressionLevel: 9 })
            .toFile(outPath)

        console.log(`${inPath.padEnd(32, ' ')} => ${outPath.padEnd(32, ' ')}`)
    }
}
ProcessDirectory('assets/icons', 32, 32)
ProcessDirectory('assets/logos', 64, 64)