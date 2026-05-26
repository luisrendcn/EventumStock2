import { useState } from 'react';
import { ScanForm } from './components/ScanForm';
import { ProductList } from './components/ProductList';
import { ReservationsPanel } from './components/ReservationsPanel';
import { CreateReservationForm } from './components/CreateReservationForm';

// ─── Tab definitions ────────────────────────────────────────────────────────
const TABS = [
  {
    id: 'scan' as const,
    label: 'Escanear',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    id: 'inventory' as const,
    label: 'Inventario',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    id: 'reservations' as const,
    label: 'Reservas',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    id: 'reserve' as const,
    label: 'Reservar',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ─── Component ───────────────────────────────────────────────────────────────
export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('scan');
  const [productRefresh, setProductRefresh] = useState(0);
  const [reservationRefresh, setReservationRefresh] = useState(0);

  function onScanSuccess() {
    setProductRefresh(k => k + 1);
  }

  function onReservationCreated() {
    setReservationRefresh(k => k + 1);
    setProductRefresh(k => k + 1);
  }

  // Helper: returns Tailwind classes to show/hide a panel
  // Mobile (< md): visible only when activeTab matches
  // Desktop (md+): always visible inside the CSS grid
  function panel(tab: TabId) {
    return activeTab === tab ? 'block md:block' : 'hidden md:block';
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {/* ── Header ── */}
      <header className="bg-slate-900 text-white px-4 sm:px-8 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">
              SGI — Gestión de Inventario
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 hidden sm:block">
              Arquitectura Hexagonal · Node.js + TypeScript
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs bg-emerald-700 text-emerald-100 px-2.5 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Backend activo </span>:3001
          </span>
        </div>
      </header>

      {/* ── Main content ── */}
      {/*
        Mobile:  single column, panels toggled by activeTab, pb-20 avoids bottom-nav overlap
        Desktop: two-column grid, all panels always visible, no bottom nav
      */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 pb-24 md:pb-8 md:grid md:grid-cols-2 md:gap-6">

        {/* ── Left column (Escanear + Reservar) ── */}
        <div className="flex flex-col gap-6">
          <div className={panel('scan')}>
            <ScanForm onSuccess={onScanSuccess} />
          </div>
          <div className={panel('reserve')}>
            <CreateReservationForm onSuccess={onReservationCreated} />
          </div>
        </div>

        {/* ── Right column (Inventario + Reservas) ── */}
        <div className="flex flex-col gap-6">
          <div className={panel('inventory')}>
            <ProductList refreshKey={productRefresh} />
          </div>
          <div className={panel('reservations')}>
            <ReservationsPanel
              refreshKey={reservationRefresh}
              onStockChange={() => setProductRefresh(k => k + 1)}
            />
          </div>
        </div>
      </main>

      {/* ── Bottom tab bar — mobile only (md:hidden) ── */}
      <nav className="fixed bottom-0 inset-x-0 md:hidden bg-white border-t border-slate-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] z-40">
        <div className="grid grid-cols-4 h-16">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium
                  transition-colors duration-150
                  ${active
                    ? 'text-blue-600'
                    : 'text-slate-400 hover:text-slate-600 active:text-slate-700'
                  }
                `}
              >
                {/* Active indicator line */}
                <span
                  className={`
                    absolute top-0 w-10 h-0.5 rounded-b-full transition-all duration-200
                    ${active ? 'bg-blue-600' : 'bg-transparent'}
                  `}
                />
                <span className={active ? 'text-blue-600' : 'text-slate-400'}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
