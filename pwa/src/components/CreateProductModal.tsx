import { useEffect, useRef, useState } from 'react';
import { api, CreateProductPayload } from '../api/client';

interface Props {
  barcode: string;
  onCreated: (productId: string) => void;
  onCancel: () => void;
}

const UNITS = ['unidad', 'caja', 'blister', 'frasco', 'ampolla', 'sobre', 'kg', 'g', 'ml', 'L'];
const CATEGORIES = ['Analgésico', 'Vitamina', 'Antibiótico', 'Antiinflamatorio', 'Suplemento', 'Otro'];

export function CreateProductModal({ barcode, onCreated, onCancel }: Props) {
  const [form, setForm] = useState<CreateProductPayload>({
    barcode,
    name: '',
    minStockThreshold: 10,
    sku: '',
    category: '',
    costPrice: undefined,
    salePrice: undefined,
    unitOfMeasure: 'unidad',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function set<K extends keyof CreateProductPayload>(key: K, value: CreateProductPayload[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: CreateProductPayload = {
        ...form,
        sku: form.sku || undefined,
        category: form.category || undefined,
        unitOfMeasure: form.unitOfMeasure || undefined,
      };
      const created = await api.createProduct(payload);
      onCreated(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  // Clases de inputs touch-friendly para modal
  const INPUT = 'w-full px-4 text-base min-h-[48px] border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      {/* En móvil: sheet desde abajo (full-width). En desktop: modal centrado */}
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Producto no encontrado</h2>
            <p className="text-xs text-slate-500 mt-0.5">Registra el nuevo producto para continuar con el escaneo</p>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none p-1"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Barcode — read only */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Código de barras <span className="text-slate-400">(del escaneo)</span>
            </label>
            <input
              className={`${INPUT} bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed`}
              value={barcode}
              readOnly
            />
          </div>

          {/* Nombre (required) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameRef}
              className={INPUT}
              placeholder="ej. Ibuprofeno 400mg"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
            />
          </div>

          {/* SKU */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">SKU</label>
            <input
              className={INPUT}
              placeholder="ej. IBU-400"
              value={form.sku ?? ''}
              onChange={e => set('sku', e.target.value)}
            />
          </div>

          {/* Categoría + Unidad de medida */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Categoría</label>
              <select
                className={INPUT}
                value={form.category ?? ''}
                onChange={e => set('category', e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Unidad</label>
              <select
                className={INPUT}
                value={form.unitOfMeasure ?? 'unidad'}
                onChange={e => set('unitOfMeasure', e.target.value)}
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Precios */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Precio costo ($)</label>
              <input
                className={INPUT}
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={form.costPrice ?? ''}
                onChange={e => set('costPrice', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Precio venta ($)</label>
              <input
                className={INPUT}
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={form.salePrice ?? ''}
                onChange={e => set('salePrice', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>

          {/* Umbral mínimo (required) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Umbral mínimo de stock <span className="text-red-500">*</span>
            </label>
            <input
              className={INPUT}
              type="number"
              min={0}
              value={form.minStockThreshold}
              onChange={e => set('minStockThreshold', Number(e.target.value))}
              required
            />
            <p className="text-xs text-slate-400 mt-1">Alerta si stock disponible cae por debajo de este valor</p>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 min-h-[48px] border border-slate-300 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              {loading ? 'Creando…' : 'Crear y continuar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
