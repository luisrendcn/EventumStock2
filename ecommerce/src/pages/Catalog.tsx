import { useEffect, useState } from 'react';
import { sgi } from '../api/sgi';
import type { Product, CartItem, Reservation } from '../types';

interface Props {
  onCheckout: (product: Product, quantity: number, reservation: Reservation) => void;
}

const TTL_OPTIONS = [
  { label: '2 min', seconds: 120 },
  { label: '5 min', seconds: 300 },
  { label: '15 min', seconds: 900 },
  { label: '30 min', seconds: 1800 },
];

const CATEGORY_EMOJI: Record<string, string> = {
  'Analgésico': '💊', 'Vitamina': '🌿', 'Antibiótico': '🧬',
  'Antiinflamatorio': '🔬', 'Suplemento': '⚗️', 'Otro': '📦',
};

function categoryEmoji(cat?: string) {
  return cat ? (CATEGORY_EMOJI[cat] ?? '📦') : '💊';
}

export function Catalog({ onCheckout }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [ttlSeconds, setTtlSeconds] = useState(TTL_OPTIONS[0].seconds);
  const [cart, setCart] = useState<CartItem | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    sgi.getProducts()
      .then(ps => {
        setProducts(ps);
        const initial: Record<string, number> = {};
        ps.forEach(p => { initial[p.id] = 1; });
        setQuantities(initial);
      })
      .catch(() => setError('No se pudo conectar con EventumStock.'))
      .finally(() => setLoading(false));
  }, []);

  function setQty(productId: string, delta: number, max: number) {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, Math.min(max, (prev[productId] ?? 1) + delta)),
    }));
  }

  function addToCart(product: Product) {
    setCart({ product, quantity: quantities[product.id] ?? 1, ttlSeconds });
    setPayError('');
  }

  async function handlePay() {
    if (!cart) return;
    setPaying(true);
    setPayError('');
    try {
      const orderId = `EC-${Date.now().toString(36).toUpperCase()}`;
      const reservation = await sgi.createReservation({
        productId: cart.product.id,
        quantity: cart.quantity,
        orderId,
        ttlSeconds: cart.ttlSeconds,
      });
      onCheckout(cart.product, cart.quantity, reservation);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Error al crear reserva');
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Cargando catálogo…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center px-6">
        <p className="text-4xl mb-4">⚠️</p>
        <p className="text-red-600 font-semibold mb-2">Sin conexión con EventumStock</p>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  const available = products.filter(p => p.available > 0);
  const unavailable = products.filter(p => p.available === 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Catálogo de productos</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Stock actualizado en tiempo real desde EventumStock
          {' · '}{available.length} productos disponibles
        </p>
      </div>

      {/* Cart bar */}
      {cart && (
        <div className="fixed bottom-0 inset-x-0 z-20 bg-indigo-950 text-white shadow-2xl border-t border-indigo-800 animate-fade-up">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl">{categoryEmoji(cart.product.category)}</span>
              <div className="min-w-0">
                <p className="font-semibold truncate">{cart.product.name}</p>
                <p className="text-xs text-indigo-300">
                  {cart.quantity} {cart.product.unitOfMeasure ?? 'unidad(es)'}
                  {cart.product.salePrice
                    ? ` · $${(cart.product.salePrice * cart.quantity).toFixed(2)}`
                    : ''}
                  {' · '}
                  reserva {TTL_OPTIONS.find(option => option.seconds === cart.ttlSeconds)?.label ?? `${cart.ttlSeconds}s`}
                </p>
              </div>

            </div>
            <div className="flex items-center gap-3 shrink-0">
              {payError && (
                <p className="text-xs text-red-300 max-w-[160px] text-right">{payError}</p>
              )}
              <button
                onClick={() => setCart(null)}
                className="text-xs text-indigo-400 hover:text-white px-3 py-2 rounded-lg transition-colors"
              >
                Quitar
              </button>
              <button
                onClick={handlePay}
                disabled={paying}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors"
              >
                {paying ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : '🛒'}
                {paying ? 'Reservando…' : 'Pagar ahora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-24">
        {available.map(product => {
          const qty = quantities[product.id] ?? 1;
          const inCart = cart?.product.id === product.id;
          return (
            <div
              key={product.id}
              className={`bg-white rounded-2xl shadow-sm border transition-all ${inCart ? 'border-indigo-400 shadow-indigo-100 shadow-md' : 'border-zinc-200 hover:shadow-md hover:border-zinc-300'}`}
            >
              {/* Card header */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-3xl">{categoryEmoji(product.category)}</span>
                  <div className="flex flex-col items-end gap-1">
                    {product.category && (
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        {product.category}
                      </span>
                    )}
                    {product.isLowStock && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        ⚠ Stock bajo
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="font-bold text-zinc-900 text-base leading-snug">{product.name}</h3>
                {product.unitOfMeasure && (
                  <p className="text-xs text-zinc-400 mt-0.5">{product.unitOfMeasure}</p>
                )}
              </div>

              {/* Price + stock */}
              <div className="px-5 flex items-center justify-between mb-4">
                <div>
                  {product.salePrice != null ? (
                    <p className="text-xl font-bold text-indigo-700">${product.salePrice.toFixed(2)}</p>
                  ) : (
                    <p className="text-sm text-zinc-400 italic">Precio no disponible</p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${product.isLowStock ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {product.available} disponibles
                  </p>
                  <p className="text-xs text-zinc-400">stock total: {product.totalStock}</p>
                </div>
              </div>

              <div className="px-5 pb-4">
                <label className="block text-xs font-medium text-zinc-500 mb-2">Tiempo de reserva</label>
                <div className="grid grid-cols-4 gap-1 rounded-xl bg-zinc-100 p-1">
                  {TTL_OPTIONS.map(option => (
                    <button
                      key={option.seconds}
                      type="button"
                      onClick={() => {
                        setTtlSeconds(option.seconds);
                        if (inCart) {
                          setCart({ product, quantity: qty, ttlSeconds: option.seconds });
                        }
                      }}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        ttlSeconds === option.seconds
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity + Add to cart */}
              <div className="px-5 pb-5 flex items-center gap-3">
                <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
                  <button
                    onClick={() => setQty(product.id, -1, product.available)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-200 text-zinc-600 font-bold transition-colors"
                  >−</button>
                  <span className="w-8 text-center text-sm font-semibold text-zinc-800">{qty}</span>
                  <button
                    onClick={() => setQty(product.id, +1, product.available)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-200 text-zinc-600 font-bold transition-colors"
                  >+</button>
                </div>
                <button
                  onClick={() => addToCart(product)}
                  className={`flex-1 py-2 text-sm font-bold rounded-xl transition-colors ${
                    inCart
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {inCart ? '✓ En carrito' : 'Agregar al carrito'}
                </button>
              </div>
            </div>
          );
        })}

        {/* Out of stock — greyed out */}
        {unavailable.map(product => (
          <div key={product.id} className="bg-white rounded-2xl border border-zinc-200 opacity-50 select-none">
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="text-3xl grayscale">{categoryEmoji(product.category)}</span>
                <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">Sin stock</span>
              </div>
              <h3 className="font-bold text-zinc-500 text-base">{product.name}</h3>
            </div>
            <div className="px-5 pb-5">
              <button disabled className="w-full py-2 bg-zinc-200 text-zinc-400 text-sm font-bold rounded-xl cursor-not-allowed">
                No disponible
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
