import { useEffect, useState } from 'react';
import { api, ProductDTO, ReservationDTO } from '../api/client';

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
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-4">Crear Reserva</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Producto</label>
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">Cantidad</label>
            <input
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">TTL (segundos)</label>
            <input
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="number"
              min={120}
              max={86400}
              value={ttlSeconds}
              onChange={e => setTtlSeconds(Number(e.target.value))}
            />
            <p className="text-xs text-slate-400 mt-1">mínimo 120s · máximo 86400s</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">ID de Orden</label>
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ej. ORD-001"
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              required
            />
            <button
              type="button"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg whitespace-nowrap transition-colors"
              onClick={() => setOrderId(generateOrderId())}
            >
              Generar
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || products.length === 0}
          className="py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors"
        >
          {loading ? 'Reservando…' : 'Crear reserva'}
        </button>
      </form>

      {result && (
        <div className="mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 space-y-0.5">
          <p>✓ Reserva creada — orden <strong>{result.orderId}</strong></p>
          <p className="text-xs text-amber-600">Expira en {result.remainingSeconds}s · ID: {result.id.slice(0, 8)}…</p>
        </div>
      )}
      {error && (
        <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
    </section>
  );
}
