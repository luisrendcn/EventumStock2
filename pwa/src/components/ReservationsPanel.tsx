import { useEffect, useRef, useState } from 'react';
import { api, ReservationDTO } from '../api/client';
import { SuccessModal } from './SuccessModal';

const POLL_MS = 3_000;   // intervalo de polling (reservas + stock externo)
const TICK_MS = 1_000;   // intervalo del contador visual de TTL

interface Props {
  refreshKey?: number;
  onStockChange?: () => void;
}

interface ConfirmResult {
  productName: string;
  quantity: number;
  stockAfter: number;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${String(sec).padStart(2, '0')}s`;
}

export function ReservationsPanel({ refreshKey, onStockChange }: Props) {
  const [reservations, setReservations] = useState<ReservationDTO[]>([]);
  const [confirming, setConfirming]     = useState<string | null>(null);
  const [tick, setTick]                 = useState(0);   // fuerza re-render cada 1 s para el countdown
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);

  // ── Countdown tick ──────────────────────────────────────────────────────────
  // Efecto propio, independiente del polling de datos.
  // Cleanup garantizado → sin memory leak.
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  void tick; // usado solo para forzar re-render

  // ── Polling de datos ────────────────────────────────────────────────────────
  // Se re-ejecuta cuando refreshKey cambia (acción manual del usuario):
  //   1. Fetch inmediato → datos actualizados sin esperar el intervalo.
  //   2. Intervalo nuevo desde cero → el reloj de 3 s se reinicia.
  //   3. Cleanup en return → clearInterval al desmontar O al re-ejecutar el efecto.
  //
  // La bandera `active` evita actualizar state si el componente ya se desmontó
  // mientras una petición estaba en vuelo.
  useEffect(() => {
    let active = true;

    function fetchData() {
      api.getActiveReservations()
        .then(data  => { if (active) setReservations(data); })
        .catch(err  => { if (active) console.error('[ReservationsPanel] poll error:', err); });
    }

    fetchData();                                   // fetch inmediato
    const poll = setInterval(fetchData, POLL_MS);  // luego cada 3 s

    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [refreshKey]); // refreshKey como dep. → reinicia el ciclo en acción manual

  // ── Confirmar reserva ───────────────────────────────────────────────────────
  async function handleConfirm(id: string) {
    setConfirming(id);
    try {
      const result = await api.confirmReservation(id);
      // Fetch inmediato tras confirmar; el poll seguirá sincronizando
      const data = await api.getActiveReservations();
      setReservations(data);
      setConfirmResult({
        productName: result.productName,
        quantity:    result.quantity,
        stockAfter:  result.stockAfter,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setConfirming(null);
    }
  }

  function handleModalClose() {
    setConfirmResult(null);
    onStockChange?.();
  }

  return (
    <>
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800">Reservas Activas</h2>
            {/* Indicador "live" — visible siempre para confirmar que el poll corre */}
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              live
            </span>
          </div>
          <button
            className="text-xs min-h-[36px] px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 rounded-lg transition-colors"
            onClick={() => {
              api.getActiveReservations()
                .then(setReservations)
                .catch(console.error);
            }}
          >
            Actualizar
          </button>
        </div>

        {reservations.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No hay reservas activas.</p>
        ) : (
          <>
            {/* ── Card layout — mobile only ── */}
            <div className="flex flex-col gap-3 sm:hidden">
              {reservations.map(r => {
                const remaining = Math.max(
                  0,
                  Math.floor((new Date(r.expiresAt).getTime() - Date.now()) / 1000),
                );
                const urgent = remaining < 60;
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded font-medium">
                          {r.orderId}
                        </code>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          remaining > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {remaining > 0 ? 'ACTIVA' : 'EXPIRADA'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {r.quantity} ud. ·{' '}
                        <span className={`font-mono font-semibold ${urgent ? 'text-red-600' : 'text-blue-600'}`}>
                          {fmt(remaining)}
                        </span>
                      </p>
                    </div>
                    {remaining > 0 && (
                      <button
                        disabled={confirming === r.id}
                        onClick={() => handleConfirm(r.id)}
                        className="shrink-0 min-h-[40px] px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        {confirming === r.id ? '…' : 'Confirmar'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Table layout — desktop (sm+) ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Orden', 'Producto', 'Cant.', 'Expira en', '', ''].map((h, i) => (
                      <th key={i} className="text-left text-xs font-medium text-slate-500 pb-2 px-2 first:pl-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reservations.map(r => {
                    const remaining = Math.max(
                      0,
                      Math.floor((new Date(r.expiresAt).getTime() - Date.now()) / 1000),
                    );
                    const urgent = remaining < 60;
                    return (
                      <tr key={r.id}>
                        <td className="py-2.5 px-2 first:pl-0">
                          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{r.orderId}</code>
                        </td>
                        <td className="py-2.5 px-2">
                          <code className="text-xs text-slate-500">{r.productId.slice(0, 8)}…</code>
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums">{r.quantity}</td>
                        <td className={`py-2.5 px-2 text-right tabular-nums font-mono text-xs font-semibold ${urgent ? 'text-red-600' : 'text-blue-600'}`}>
                          {fmt(remaining)}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            remaining > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {remaining > 0 ? 'ACTIVA' : 'EXPIRADA'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          {remaining > 0 && (
                            <button
                              disabled={confirming === r.id}
                              onClick={() => handleConfirm(r.id)}
                              className="text-xs px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg transition-colors"
                            >
                              {confirming === r.id ? '…' : 'Confirmar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {confirmResult && (
        <SuccessModal
          title="¡Reserva confirmada!"
          details={[
            { label: 'Producto',            value: confirmResult.productName },
            { label: 'Cantidad descontada', value: `${confirmResult.quantity} ud.` },
            { label: 'Stock disponible',    value: confirmResult.stockAfter },
          ]}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}
