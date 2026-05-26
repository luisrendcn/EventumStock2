import { useEffect, useState } from 'react';
import { api, ProductDTO, ReservationDTO } from '../api/client';

const INPUT =
  'w-full px-4 text-base min-h-[48px] border border-slate-300 rounded-xl ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

interface Props {
  onSuccess: () => void;
}

export function CreateReservationForm({ onSuccess }: Props) {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [orderId, setOrderId] = useState('');
  const [ttlSeconds, setTtlSeconds] = useState(120);
  const [result, setResult] = useState<ReservationDTO | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getProducts()
      .then(ps => {
        setProducts(ps);
        if (ps.length > 0) setProductId(ps[0].id);
      })
      .catch(console.error);
  }, []);

  function generateOrderId() {
    return `ORD-${Date.now().toString(36).toUpperCase()}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const r = await api.createReservation({ productId, quantity, orderId, ttlSeconds });
      setResult(r);
      setOrderId('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-4">Crear Reserva</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">

        {/* Producto */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Producto</label>
          <select
            className={INPUT}
            value={productId}
            onChange={e => setProductId(e.target.value)}
            required
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} (disponible: {p.available})
              </option>
            ))}
          </select>
        </div>

        {/* Cantidad + TTL — dos columnas siempre (son números, caben bien) */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Cantidad</label>
            <input
              className={INPUT}
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">TTL (seg.)</label>
            <input
              className={INPUT}
              type="number"
              min={120}
              max={86400}
              value={ttlSeconds}
              onChange={e => setTtlSeconds(Number(e.target.value))}
            />
            <p className="text-xs text-slate-400 mt-1">120 s – 86 400 s</p>
          </div>
        </div>

        {/* ID de Orden */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">ID de Orden</label>
          <div className="flex gap-2">
            <input
              className={`${INPUT} flex-1`}
              placeholder="ej. ORD-001"
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              required
            />
            <button
              type="button"
              className="px-4 min-h-[48px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-sm font-medium rounded-xl whitespace-nowrap transition-colors"
              onClick={() => setOrderId(generateOrderId())}
            >
              Generar
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || products.length === 0}
          className="min-h-[48px] bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-60 text-white font-semibold text-base rounded-xl transition-colors"
        >
          {loading ? 'Reservando…' : 'Crear reserva'}
        </button>
      </form>

      {result && (
        <div className="mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-0.5">
          <p>✓ Reserva creada — orden <strong>{result.orderId}</strong></p>
          <p className="text-xs text-amber-600">
            Expira en {result.remainingSeconds}s · ID: {result.id.slice(0, 8)}…
          </p>
        </div>
      )}
      {error && (
        <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}
    </section>
  );
}
