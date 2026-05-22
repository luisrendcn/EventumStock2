import { useEffect, useRef, useState } from 'react';
import { sgi } from '../api/sgi';
import type { Product, Reservation } from '../types';

interface Props {
  product: Product;
  quantity: number;
  reservation: Reservation;
  onSuccess: (productName: string, quantity: number, orderId: string, stockAfter: number) => void;
  onCancel: () => void;
  onExpired: () => void;
}

export function Checkout({ product, quantity, reservation, onSuccess, onCancel, onExpired }: Props) {
  const [remaining, setRemaining] = useState(reservation.remainingSeconds);
  const [status, setStatus] = useState<'active' | 'confirming' | 'cancelling' | 'expired'>('active');
  const [error, setError] = useState('');
  const expiredRef = useRef(false);

  useEffect(() => {
    if (remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1;
        if (next <= 0 && !expiredRef.current) {
          expiredRef.current = true;
          clearInterval(interval);
          setStatus('expired');
          setTimeout(() => onExpired(), 1500);
        }
        return Math.max(0, next);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  async function handleConfirm() {
    setStatus('confirming');
    setError('');
    try {
      const result = await sgi.confirmReservation(reservation.id);
      onSuccess(result.productName, result.quantity, reservation.orderId, result.stockAfter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al confirmar');
      setStatus('active');
    }
  }

  async function handleCancel() {
    setStatus('cancelling');
    setError('');
    try {
      await sgi.cancelReservation(reservation.id);
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar');
      setStatus('active');
    }
  }

  const pct = Math.max(0, (remaining / reservation.ttlSeconds) * 100);
  const isUrgent = remaining <= 30;
  const isExpired = status === 'expired';

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      {/* Order ID badge */}
      <p className="text-center text-xs font-mono text-zinc-400 mb-6">
        Orden <span className="text-indigo-600 font-semibold">{reservation.orderId}</span>
      </p>

      <div className={`bg-white rounded-3xl shadow-xl border-2 transition-colors ${isExpired ? 'border-red-300' : isUrgent ? 'border-amber-300' : 'border-indigo-200'} overflow-hidden`}>
        {/* Header */}
        <div className={`px-8 py-6 text-center transition-colors ${isExpired ? 'bg-red-50' : isUrgent ? 'bg-amber-50' : 'bg-indigo-50'}`}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-zinc-400">
            {isExpired ? 'Reserva expirada' : 'Procesando pago'}
          </p>
          <h1 className="text-xl font-bold text-zinc-900 mb-4">{product.name}</h1>

          {/* Countdown ring */}
          <div className="relative inline-flex items-center justify-center w-32 h-32 mx-auto mb-3">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#e4e4e7" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke={isExpired ? '#ef4444' : isUrgent ? '#f59e0b' : '#6366f1'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="text-center z-10">
              <span className={`text-3xl font-bold tabular-nums ${isExpired ? 'text-red-500' : isUrgent ? 'text-amber-600' : 'text-indigo-700'}`}>
                {mm}:{ss}
              </span>
              <p className="text-[10px] text-zinc-400 mt-0.5">restantes</p>
            </div>
          </div>

          {/* Status badge */}
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
            isExpired ? 'bg-red-100 text-red-700' :
            isUrgent ? 'bg-amber-100 text-amber-700' :
            'bg-emerald-100 text-emerald-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-red-500' : isUrgent ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
            {isExpired ? 'EXPIRADA' : 'ACTIVA'}
          </span>
        </div>

        {/* Order summary */}
        <div className="px-8 py-5 border-b border-zinc-100">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-500">Producto</span>
            <span className="font-medium text-zinc-800">{product.name}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-500">Cantidad</span>
            <span className="font-medium text-zinc-800">{quantity} {product.unitOfMeasure ?? 'unidad(es)'}</span>
          </div>
          {product.salePrice != null && (
            <div className="flex justify-between text-sm pt-2 border-t border-zinc-100">
              <span className="font-semibold text-zinc-700">Total</span>
              <span className="font-bold text-indigo-700 text-base">${(product.salePrice * quantity).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-8 py-6 space-y-3">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-center">
              {error}
            </p>
          )}

          <button
            onClick={handleConfirm}
            disabled={status !== 'active'}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-colors shadow-sm"
          >
            {status === 'confirming' ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : '✓'}
            {status === 'confirming' ? 'Confirmando…' : 'Confirmar pago exitoso'}
          </button>

          <button
            onClick={handleCancel}
            disabled={status !== 'active'}
            className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-100 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 font-semibold rounded-2xl transition-colors text-sm"
          >
            {status === 'cancelling' ? (
              <span className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            ) : '✕'}
            {status === 'cancelling' ? 'Cancelando…' : 'Cancelar compra'}
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-zinc-400 mt-4">
        La reserva expira automáticamente al llegar a 0:00
      </p>
    </div>
  );
}
