// Barcode reading in the browser. Uses the built-in BarcodeDetector where it exists
// (Chrome on Android) and otherwise a WebAssembly port of ZXing (e.g. Safari on iPhone).
// This module is only loaded when the scanner opens.

import { normalizeGtin } from '../../lib/gtin'

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const

interface Detector {
  detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]>
}

interface NativeBarcodeDetectorClass {
  new (options: { formats: readonly string[] }): Detector
  getSupportedFormats(): Promise<string[]>
}

let detector: Promise<Detector> | undefined

async function createDetector(): Promise<Detector> {
  const Native = (window as unknown as { BarcodeDetector?: NativeBarcodeDetectorClass })
    .BarcodeDetector
  if (Native) {
    const supported = await Native.getSupportedFormats()
    if (supported.includes('ean_13')) {
      return new Native({ formats: FORMATS })
    }
  }
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])
  // Serve the .wasm from this app instead of the library's default CDN.
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith('.wasm') ? wasmUrl : prefix + path,
    },
  })
  return new BarcodeDetector({ formats: [...FORMATS] })
}

/** Shared detector, created on first use. */
export function getDetector(): Promise<Detector> {
  detector ??= createDetector()
  return detector
}

/** The first valid GTIN in the image (a video frame or a photo), or null. */
export async function readBarcode(source: ImageBitmapSource): Promise<string | null> {
  const results = await (await getDetector()).detect(source)
  for (const result of results) {
    const gtin = normalizeGtin(result.rawValue)
    if (gtin) return gtin
  }
  return null
}
