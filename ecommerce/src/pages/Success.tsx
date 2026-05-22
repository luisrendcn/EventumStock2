interface Props {
  productName: string;
  quantity: number;
  orderId: string;
  stockAfter: number;
  onBack: () => void;
}

export function Success({ productName, quantity, orderId, stockAfter, onBack }: Props) {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      {/* Check animation */}
      <div className="relative inline-flex items-center justify-center w-24 h-24 mx-auto mb-8">
        <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-30" />
        <div className="relative flex items-center justify-center w-24 h-24 bg-emerald-100 rounded-full">
          <svg className="w-12 h-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-zinc-900 mb-2">¡Compra exitosa!</h1>
      <p className="text-zinc-500 mb-10">Tu pedido ha sido confirmado y el stock ha sido descontado.</p>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 text-left mb-8 overflow-hidden">
        <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Resumen del pedido</p>
        </div>
        <div className="px-6 py-4 space-y-3">
          <Row label="Orden" value={orderId} mono />
          <Row label="Producto" value={productName} />
          <Row label="Cantidad" value={String(quantity)} />
          <Row label="Stock restante" value={`${stockAfter} unidades`} highlight />
        </div>
      </div>

      <button
        onClick={onBack}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors shadow-sm"
      >
        Volver al catálogo
      </button>
    </div>
  );
}

function Row({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-semibold ${mono ? 'font-mono text-indigo-600' : highlight ? 'text-emerald-700' : 'text-zinc-800'}`}>
        {value}
      </span>
    </div>
  );
}
