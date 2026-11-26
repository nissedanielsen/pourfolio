// GTIN barcodes (EAN-8, UPC-A, EAN-13, GTIN-14). Mirrors the backend's validation so
// typos are caught before asking the server.

/** The check digit for the given digits (all but the last of a GTIN). */
function checkDigit(body: string): number {
  let sum = 0
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i])
    sum += digit * (i % 2 === 0 ? 3 : 1)
  }
  return (10 - (sum % 10)) % 10
}

export function isValidGtin(value: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(value)) return false
  return checkDigit(value.slice(0, -1)) === Number(value.slice(-1))
}

/** The barcode without spaces if it is a valid GTIN, otherwise null. */
export function normalizeGtin(value: string): string | null {
  const digits = value.replace(/\s/g, '')
  return isValidGtin(digits) ? digits : null
}
