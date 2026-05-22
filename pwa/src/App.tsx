import { useState } from 'react';
import { ScanForm } from './components/ScanForm';
import { ProductList } from './components/ProductList';
import { ReservationsPanel } from './components/ReservationsPanel';
import { CreateReservationForm } from './components/CreateReservationForm';

export function App() {
  const [productRefresh, setProductRefresh] = useState(0);
  const [reservationRefresh, setReservationRefresh] = useState(0);

  function onScanSuccess() {
    setProductRefresh(k => k + 1);
  }

  function onReservationCreated() {
    setReservationRefresh(k => k + 1);
    setProductRefresh(k => k + 1);
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <header className="bg-slate-900 text-white px-8 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">SGI — Sistema de Gestión de Inventario</h1>
            <p className="text-xs text-slate-400 mt-0.5">Arquitectura Hexagonal · Node.js + TypeScript</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-emerald-700 text-emerald-100 px-3 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Backend activo :3001
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <ScanForm onSuccess={onScanSuccess} />
          <CreateReservationForm onSuccess={onReservationCreated} />
        </div>
        <div className="flex flex-col gap-6">
          <ProductList refreshKey={productRefresh} />
          <ReservationsPanel refreshKey={reservationRefresh} onStockChange={() => setProductRefresh(k => k + 1)} />
        </div>
      </main>
    </div>
  );
}
