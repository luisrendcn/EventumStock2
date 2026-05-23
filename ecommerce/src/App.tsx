import { useState } from 'react';
import { Catalog } from './pages/Catalog';
import { Checkout } from './pages/Checkout';
import { Success } from './pages/Success';
import { Expired } from './pages/Expired';
import type { Product, Reservation } from './types';

type Screen =
  | { name: 'catalog' }
  | { name: 'checkout'; product: Product; quantity: number; reservation: Reservation }
  | { name: 'success'; productName: string; quantity: number; orderId: string; stockAfter: number }
  | { name: 'expired'; productName: string };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'catalog' });

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Header */}
      <header className="bg-indigo-950 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setScreen({ name: 'catalog' })}
            className="flex items-center gap-2.5 group"
          >
            <span className="text-2xl">💊</span>
            <div>
              <p className="text-lg font-bold tracking-tight group-hover:text-indigo-200 transition-colors">MedStore</p>
              <p className="text-xs text-indigo-400">Farmacia Online</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-indigo-400 hidden sm:block">Inventario en tiempo real via</span>
            <span className="text-xs bg-indigo-800 text-indigo-200 px-2.5 py-1 rounded-full font-mono">
              EventumStock API :3001
            </span>
          </div>
        </div>
      </header>

      {/* Screens */}
      {screen.name === 'catalog' && (
        <Catalog
          onCheckout={(product, quantity, reservation) =>
            setScreen({ name: 'checkout', product, quantity, reservation })
          }
        />
      )}

      {screen.name === 'checkout' && (
        <Checkout
          product={screen.product}
          quantity={screen.quantity}
          reservation={screen.reservation}
          onSuccess={(productName, quantity, orderId, stockAfter) =>
            setScreen({ name: 'success', productName, quantity, orderId, stockAfter })
          }
          onCancel={() => setScreen({ name: 'catalog' })}
          onExpired={() => setScreen({ name: 'expired', productName: screen.product.name })}
        />
      )}

      {screen.name === 'success' && (
        <Success
          productName={screen.productName}
          quantity={screen.quantity}
          orderId={screen.orderId}
          stockAfter={screen.stockAfter}
          onBack={() => setScreen({ name: 'catalog' })}
        />
      )}

      {screen.name === 'expired' && (
        <Expired
          productName={screen.productName}
          onRetry={() => setScreen({ name: 'catalog' })}
        />
      )}
    </div>
  );
}
