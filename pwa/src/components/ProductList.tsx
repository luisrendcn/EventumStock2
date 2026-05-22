import { useEffect, useState } from 'react';
import { api, ProductDTO } from '../api/client';

interface Props {
  refreshKey: number;
}

export function ProductList({ refreshKey }: Props) {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-800">Inventario</h2>
        {!loading && (
          <span className="text-xs text-slate-400">{products.length} producto{products.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 py-4 text-center">Cargando…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">Sin productos registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {['Nombre', 'Código', 'Total', 'Reservado', 'Disponible', 'Umbral'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 pb-2 px-2 first:pl-0 last:pr-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map(p => (
                <tr key={p.id} className={p.isLowStock ? 'bg-red-50' : ''}>
                  <td className="py-2.5 px-2 first:pl-0 font-medium text-slate-800">{p.name}</td>
                  <td className="py-2.5 px-2">
                    <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{p.barcode}</code>
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">{p.totalStock}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-amber-600">{p.reserved}</td>
                  <td className={`py-2.5 px-2 text-right tabular-nums font-bold ${p.isLowStock ? 'text-red-600' : 'text-emerald-600'}`}>
                    {p.available}
                    {p.isLowStock && (
                      <span className="ml-1 text-xs font-normal text-red-500">⚠</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 last:pr-0 text-right tabular-nums text-slate-400">{p.minStockThreshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
