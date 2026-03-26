import sharp from "sharp"
try { require('dotenv').config() } catch (e) { }

// Export Variables
const PARSED_ADDR = /^([A-z0-9.]+):([0-9]+)$/.exec(process.env['WEB_ADDR'] || 'localhost:8080')
if (PARSED_ADDR === null) {
    process.stdout.write(`[ENV] Malformed TCP Address for Variable 'WEB_ADDR' (Ex. localhost:8080, 127.0.0.1:8080)\n`)
    process.exit(4)
}
export const PRODUCTION = (process.env['NODE_ENV']?.trim() == 'production')
export const WEB_PORT = parseInt(PARSED_ADDR[2]!)
export const WEB_ADDR = PARSED_ADDR[1]!

// Constants
export const PROCESSOR_PREFIX = 'file://'
export const PROCESSOR_DIRECT = 'https://suzzygames.com' // todo: reimplement direct urls for og tags and such
export const PROCESSOR_INDEX: Record<string, number> = {}
export const PROCESSOR_ASSETS = new Array<{
    type: string;
    size: number;
    file: string | Buffer;
}>()

// Presets Available to Image Processor
export const PROCESSOR_PRESETS: Record<string, {
    height: number;
    width: number;
    quality: number;
    format: keyof sharp.FormatEnum;
    resize: sharp.ResizeOptions;
}> = {
    'icon': {
        height: 64,
        width: 64,
        quality: 100,
        format: 'png',
        resize: {}
    },
    'branding': {
        height: 128,
        width: 128,
        quality: 80,
        format: 'png',
        resize: {
            fit: 'contain',
            kernel: 'lanczos3',
            background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0
            },
        }
    },
}

// Common extensions and their MIME types
export const CONTENT_TYPE_MAP: Record<string, string> = {
    // Text and Web
    'html': 'text/html',
    'htm': 'text/html',
    'js': 'text/javascript',
    'css': 'text/css',
    'json': 'application/json',
    'xml': 'application/xml',
    'csv': 'text/csv',
    'txt': 'text/plain',
    'md': 'text/markdown',
    // Images
    'png': 'image/png',
    'jpeg': 'image/jpeg',
    'jpg': 'image/jpeg',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'tiff': 'image/tiff',
    'heic': 'image/heic',
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4',
    'flac': 'audio/flac',
    'opus': 'audio/opus',
    // Video
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'mkv': 'video/x-matroska',
    // Fonts
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    'eot': 'application/vnd.ms-fontobject',
    // Application files
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'gz': 'application/gzip',
    'tar': 'application/x-tar',
    'rar': 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    'exe': 'application/vnd.microsoft.portable-executable',
}