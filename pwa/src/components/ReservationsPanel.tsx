import { useEffect, useRef, useState } from 'react';
import { api, ReservationDTO } from '../api/client';
import { SuccessModal } from './SuccessModal';

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
  const [confirming, setConfirming] = useState<string | null>(null);
  const [ticks, setTicks] = useState(0);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);

  const fetchReservations = () =>
    api.getActiveReservations().then(setReservations).catch(console.error);

  useEffect(() => { fetchReservations(); }, [refreshKey]);

  useEffect(() => {
    fetchReservations();
    const tick = setInterval(() => setTicks(t => t + 1), 1000);
    const poll = setInterval(fetchReservations, 30_000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, []);

  async function handleConfirm(id: string) {
    setConfirming(id);
    try {
      const result = await api.confirmReservation(id);
      await fetchReservations();
      setConfirmResult({
        productName: result.productName,
        quantity: result.quantity,
        stockAfter: result.stockAfter,
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

  void ticks;

  return (
    <>
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">Reservas Activas</h2>
          <button
            className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
            onClick={fetchReservations}
          >
            Actualizar
          </button>
        </div>

        {reservations.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No hay reservas activas.</p>
        ) : (
          <div className="overflow-x-auto">
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
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${remaining > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                          {remaining > 0 ? 'ACTIVA' : 'EXPIRADA'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        {remaining > 0 && (
                          <button
                            disabled={confirming === r.id}
                            onClick={() => handleConfirm(r.id)}
                            className="text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-md transition-colors"
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
        )}
      </section>

      {confirmResult && (
        <SuccessModal
          title="¡Reserva confirmada!"
          details={[
            { label: 'Producto',           value: confirmResult.productName },
            { label: 'Cantidad descontada', value: `${confirmResult.quantity} ud.` },
            { label: 'Stock disponible',   value: confirmResult.stockAfter },
          ]}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}
