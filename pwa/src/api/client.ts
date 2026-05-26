const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body as T;
}

export interface ProductDTO {
  id: string;
  barcode: string;
  name: string;
  totalStock: number;
  reserved: number;
  available: number;
  minStockThreshold: number;
  isLowStock: boolean;
  sku?: string;
  category?: string;
  costPrice?: number;
  salePrice?: number;
  unitOfMeasure?: string;
  lots: { id: string; lotNumber: string; quantity: number; expiryDate: string }[];
}

export interface ReservationDTO {
  id: string;
  productId: string;
  quantity: number;
  orderId: string;
  ttlSeconds: number;
  expiresAt: string;
  remainingSeconds: number;
  status: string;
}

export interface ScanOutput {
  productId: string;
  productName: string;
  type: 'IN' | 'OUT';
  quantity: number;
  stockAfter: number;
}

export interface CreateProductPayload {
  barcode: string;
  name: string;
  minStockThreshold: number;
  sku?: string;
  category?: string;
  costPrice?: number;
  salePrice?: number;
  unitOfMeasure?: string;
}

export interface CreatedProductDTO {
  id: string;
  barcode: string;
  name: string;
  minStockThreshold: number;
  sku?: string;
  category?: string;
  costPrice?: number;
  salePrice?: number;
  unitOfMeasure?: string;
}

export const api = {
  getProducts: () => request<ProductDTO[]>('/products'),

  createProduct: (payload: CreateProductPayload) =>
    request<CreatedProductDTO>('/products', { method: 'POST', body: JSON.stringify(payload) }),

  scan: (payload: {
    barcode: string;
    quantity: number;
    type: 'IN' | 'OUT';
    lotNumber?: string;
    expiryDate?: string;
  }) => request<ScanOutput>('/scan', { method: 'POST', body: JSON.stringify(payload) }),

  getActiveReservations: () => request<ReservationDTO[]>('/reservations/active'),

  createReservation: (payload: {
    productId: string;
    quantity: number;
    orderId: string;
    ttlSeconds?: number;
  }) => request<ReservationDTO>('/reservations', { method: 'POST', body: JSON.stringify(payload) }),

  confirmReservation: (id: string) =>
    request<{ message: string; productName: string; quantity: number; stockAfter: number }>(`/reservations/${id}/confirm`, { method: 'PATCH' }),

  /**
   * Emite el barcode escaneado por el móvil a todos los clientes WebSocket
   * conectados (desktop SGI). Fire-and-forget — el móvil no espera respuesta.
   */
  broadcastBarcode: (barcode: string, deviceId = 'mobile') =>
    request<{ ok: boolean; barcode: string; recipients: number }>('/scan/broadcast', {
      method: 'POST',
      body: JSON.stringify({ barcode, deviceId }),
    }),
};
