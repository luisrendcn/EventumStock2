export type BarcodeFormat = 'EAN-13' | 'EAN-8' | 'Code128';

function randomDigits(n: number): number[] {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10));
}

// GS1 spec: rightmost base digit always gets ×3, alternating toward the left.
// For 12-digit base (EAN-13): positions 0,2,4,6,8,10 → ×1; 1,3,5,7,9,11 → ×3
// For 7-digit  base (EAN-8):  positions 0,2,4,6 → ×3;  1,3,5 → ×1
function eanCheckDigit(digits: number[]): number {
  const n = digits.length;
  const sum = digits.reduce((acc, d, i) => {
    const mult = (n - 1 - i) % 2 === 0 ? 3 : 1;
    return acc + d * mult;
  }, 0);
  return (10 - (sum % 10)) % 10;
}

export function generateBarcode(format: BarcodeFormat): string {
  if (format === 'EAN-13') {
    const base = randomDigits(12);
    return [...base, eanCheckDigit(base)].join('');
  }

  if (format === 'EAN-8') {
    const base = randomDigits(7);
    return [...base, eanCheckDigit(base)].join('');
  }

  // Code128: 8 chars A-Z + 0-9
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
