interface Detail {
  label: string;
  value: string | number;
}

interface Props {
  title: string;
  details: Detail[];
  onClose: () => void;
}

export function SuccessModal({ title, details, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in">
        {/* Ícono */}
        <div className="flex justify-center pt-8 pb-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h2 className="text-center text-lg font-bold text-slate-800 px-6 pb-4">{title}</h2>

        {/* Detalles */}
        <dl className="mx-6 mb-6 divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
          {details.map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center px-4 py-2.5 bg-slate-50">
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="text-sm font-semibold text-slate-800 text-right max-w-[60%] truncate">{value}</dd>
            </div>
          ))}
        </dl>

        {/* Botón */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
