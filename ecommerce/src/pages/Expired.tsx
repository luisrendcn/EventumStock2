interface Props {
  productName: string;
  onRetry: () => void;
}

export function Expired({ productName, onRetry }: Props) {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="flex items-center justify-center w-24 h-24 bg-amber-100 rounded-full mx-auto mb-8">
        <svg className="w-12 h-12 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900 mb-2">Reserva expirada</h1>
      <p className="text-zinc-500 mb-3">
        El tiempo para completar la compra de <span className="font-semibold text-zinc-700">{productName}</span> ha expirado.
      </p>
      <p className="text-sm text-zinc-400 mb-10">
        El stock ha sido liberado automáticamente y el producto está disponible nuevamente.
      </p>

      <button
        onClick={onRetry}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors shadow-sm"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
