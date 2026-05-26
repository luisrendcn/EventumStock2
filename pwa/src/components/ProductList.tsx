import { useEffect, useState } from 'react';
import { api, ProductDTO } from '../api/client';

const POLL_MS = 3_000;

interface Props {
  refreshKey: number;
}

export function ProductList({ refreshKey }: Props) {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading]   = useState(true);

  // ── Polling de datos ────────────────────────────────────────────────────────
  // Estrategia de loading:
  //   - Primera carga (loading=true): muestra "Cargando…" hasta el primer fetch.
  //   - Polls subsiguientes: actualiza datos en silencio, SIN volver a poner
  //     loading=true → evita parpadeo visual cada 3 s.
  //   - refreshKey cambia (acción manual del usuario, ej. scan):
  //       → fetch inmediato + intervalo reiniciado desde cero.
  //       → NO cambia loading (los datos ya están en pantalla, solo se actualizan).
  //
  // La bandera `active` es una guardia para evitar setState sobre un componente
  // desmontado si una petición queda en vuelo durante el cleanup.
  useEffect(() => {
    let active = true;

    function fetchProducts() {
      api.getProducts()
        .then(data => {
          if (!active) return;
          setProducts(data);
          setLoading(false);   // quita el spinner en el primer fetch; no-op después
        })
        .catch(err => {
          if (!active) return;
          console.error('[ProductList] poll error:', err);
          setLoading(false);
        });
    }

    fetchProducts();                                    // fetch inmediato
    const poll = setInterval(fetchProducts, POLL_MS);   // luego cada 3 s

    return () => {
      active = false;
      clearInterval(poll);   // ← limpieza garantizada: sin memory leak, sin orphan requests
    };
  }, [refreshKey]);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-800">Inventario</h2>
          {/* Indicador "live" — confirma visualmente que el poll está activo */}
          <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            live
          </span>
        </div>
        {!loading && (
          <span className="text-xs text-slate-400">
            {products.length} producto{products.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 py-6 text-center">Cargando…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Sin productos registrados.</p>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 pb-2 pr-2">Nombre</th>
                <th className="hidden sm:table-cell text-left text-xs font-medium text-slate-500 pb-2 px-2">Código</th>
                <th className="text-right text-xs font-medium text-slate-500 pb-2 px-2">Total</th>
                <th className="hidden sm:table-cell text-right text-xs font-medium text-slate-500 pb-2 px-2">Reservado</th>
                <th className="text-right text-xs font-medium text-slate-500 pb-2 px-2">Disponible</th>
                <th className="hidden sm:table-cell text-right text-xs font-medium text-slate-500 pb-2 pl-2">Umbral</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map(p => (
                <tr key={p.id} className={p.isLowStock ? 'bg-red-50' : ''}>
                  <td className="py-3 pr-2 font-medium text-slate-800 leading-tight">
                    <span className="block">{p.name}</span>
                    <code className="sm:hidden text-[11px] text-slate-400 font-normal">{p.barcode}</code>
                  </td>
                  <td className="hidden sm:table-cell py-3 px-2">
                    <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{p.barcode}</code>
                  </td>
                  <td className="py-3 px-2 text-right tabular-nums text-slate-600">{p.totalStock}</td>
                  <td className="hidden sm:table-cell py-3 px-2 text-right tabular-nums text-amber-600">{p.reserved}</td>
                  <td className={`py-3 px-2 text-right tabular-nums font-bold ${p.isLowStock ? 'text-red-600' : 'text-emerald-600'}`}>
                    {p.available}
                    {p.isLowStock && <span className="ml-1 text-xs font-normal text-red-500">⚠</span>}
                  </td>
                  <td className="hidden sm:table-cell py-3 pl-2 text-right tabular-nums text-slate-400">{p.minStockThreshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
