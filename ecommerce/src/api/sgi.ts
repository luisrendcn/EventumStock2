import type { Product, Reservation } from '../types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body as T;
}

export const sgi = {
  getProducts: () =>
    request<Product[]>('/products'),

  createReservation: (payload: { productId: string; quantity: number; orderId: string; ttlSeconds: number }) =>
    request<Reservation>('/reservations', { method: 'POST', body: JSON.stringify(payload) }),

  confirmReservation: (id: string) =>
    request<{ message: string; productName: string; quantity: number; stockAfter: number }>(
      `/reservations/${id}/confirm`, { method: 'PATCH' },
    ),

  cancelReservation: (id: string) =>
    request<{ message: string }>(`/reservations/${id}/cancel`, { method: 'POST' }),
};
