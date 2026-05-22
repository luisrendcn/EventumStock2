export interface ScanResult {
  productId: string;
  name: string;
}

export interface IBarcodeScanner {
  scan(barcode: string): Promise<ScanResult>;
}
