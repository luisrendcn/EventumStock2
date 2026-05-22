export interface Product {
  id: string;
  barcode: string;
  name: string;
  available: number;
  totalStock: number;
  minStockThreshold: number;
  isLowStock: boolean;
  salePrice?: number;
  costPrice?: number;
  category?: string;
  unitOfMeasure?: string;
}

export interface Reservation {
  id: string;
  productId: string;
  quantity: number;
  orderId: string;
  ttlSeconds: number;
  expiresAt: string;
  remainingSeconds: number;
  status: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
