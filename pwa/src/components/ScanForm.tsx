import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { api, ScanOutput } from '../api/client';
import { CreateProductModal } from './CreateProductModal';
import { SuccessModal } from './SuccessModal';
import { BarcodeFormat, generateBarcode } from '../utils/barcodeGenerator';

const DEMO_BARCODES = [
  { code: '5901234123457', label: 'Ibuprofeno' },
  { code: '4006381333931', label: 'Paracetamol' },
  { code: '8410032800018', label: 'Vitamina C' },
];

const FORMATS: { value: BarcodeFormat; label: string; hint: string }[] = [
  { value: 'EAN-13', label: 'EAN-13', hint: '13 dígitos con dígito verificador' },
  { value: 'EAN-8',  label: 'EAN-8',  hint: '8 dígitos con dígito verificador' },
  { value: 'Code128', label: 'Code128', hint: '8 caracteres alfanuméricos' },
];

interface ScanParams {
  barcode: string;
  quantity: number;
  type: 'IN' | 'OUT';
  lotNumber?: string;
  expiryDate?: string;
}

interface Props {
  onSuccess: () => void;
}

type ToastState = { message: string; id: number } | null;

function extractBarcodeFromScan(rawValue: string): string {
  const value = rawValue.trim();

  try {
    const parsed = JSON.parse(value) as { barcode?: unknown; code?: unknown; productCode?: unknown };
    const candidate = parsed.barcode ?? parsed.code ?? parsed.productCode;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  } catch {
    // Plain barcodes are expected, JSON is only supported for EventumStock QR labels.
  }

  try {
    const url = new URL(value);
    const candidate = url.searchParams.get('barcode') ?? url.searchParams.get('code');
    if (candidate?.trim()) return candidate.trim();
  } catch {
    // Not a URL; use the raw scanner value.
  }

  return value;
}

export function ScanForm({ onSuccess }: Props) {
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [lotNumber, setLotNumber] = useState('L001');
  const [expiryDate, setExpiryDate] = useState('2026-12-31');
  const [result, setResult] = useState<ScanOutput | null>(null);
  const [entryModal, setEntryModal] = useState<ScanOutput & { lotNumber: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [scannerStatus, setScannerStatus] = useState('Preparando cámara…');

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);

  const pendingScan = useRef<ScanParams | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalBarcode, setModalBarcode] = useState('');

  const [toast, setToast] = useState<ToastState>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  useEffect(() => {
    if (!scannerOpen) return;

    let cancelled = false;
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    setScannerError('');
    setScannerStatus('Autoriza la cámara y apunta al código del producto.');

    async function startScanner() {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      if (cancelled) return;

      const codeReader = new BrowserMultiFormatReader();
      const controls = await codeReader.decodeFromConstraints(
        constraints,
        videoRef.current ?? undefined,
        (result) => {
          if (!result || cancelled) return;

          const scannedBarcode = extractBarcodeFromScan(result.getText());
          setBarcode(scannedBarcode);
          setScannerStatus('Código detectado.');
          showToast(`Código escaneado: ${scannedBarcode}`);
          scannerControlsRef.current?.stop();
          scannerControlsRef.current = null;
          setScannerOpen(false);
        },
      );

      return controls;
    }

    startScanner()
      .then((controls) => {
        if (!controls) return;
        if (cancelled) {
          controls.stop();
          return;
        }
        scannerControlsRef.current = controls;
        setScannerStatus('Cámara activa. Acerca el código al recuadro.');
      })
      .catch((err) => {
        setScannerError(
          err instanceof Error
            ? err.message
            : 'No se pudo iniciar la cámara. Revisa permisos del navegador.',
        );
        setScannerStatus('Cámara no disponible.');
      });

    return () => {
      cancelled = true;
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
    };
  }, [scannerOpen]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleGenerate(format: BarcodeFormat) {
    setBarcode(generateBarcode(format));
    setDropdownOpen(false);
  }

  function pickDemoBarcode() {
    const idx = Math.floor(Math.random() * DEMO_BARCODES.length);
    setBarcode(DEMO_BARCODES[idx].code);
  }

  function closeScanner() {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    setScannerOpen(false);
  }

  async function executeScan(params: ScanParams): Promise<ScanOutput> {
    return api.scan(params);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    const params: ScanParams = {
      barcode,
      quantity,
      type,
      ...(type === 'IN' ? { lotNumber, expiryDate } : {}),
    };

    try {
      const out = await executeScan(params);
      if (out.type === 'IN') {
        setEntryModal({ ...out, lotNumber });
      } else {
        setResult(out);
      }
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('no encontrado') || message.toLowerCase().includes('not found')) {
        pendingScan.current = params;
        setModalBarcode(barcode);
        setShowModal(true);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleProductCreated(_productId: string) {
    setShowModal(false);
    // Refresh table immediately — the product exists in DB now regardless of scan result
    onSuccess();

    if (!pendingScan.current) return;

    setLoading(true);
    setError('');
    try {
      const savedLot = pendingScan.current.lotNumber ?? '';
      const out = await executeScan(pendingScan.current);
      pendingScan.current = null;
      if (out.type === 'IN') {
        setEntryModal({ ...out, lotNumber: savedLot });
      } else {
        setResult(out);
        showToast(`Producto creado y movimiento registrado — stock: ${out.stockAfter}`);
      }
      onSuccess();
    } catch (err) {
      pendingScan.current = null;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleModalCancel() {
    setShowModal(false);
    pendingScan.current = null;
    setError('Escaneo cancelado — producto no registrado.');
  }

  return (
    <>
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Escaneo de Inventario</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Fila: input + Generar código + Escaneo real/simulado */}
          <div className="flex gap-2">
            <input
              className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Código de barras"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              required
            />

            {/* Dropdown Generar código */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg whitespace-nowrap transition-colors border border-blue-200"
              >
                Generar código
                <svg className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                  <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Formato</p>
                  {FORMATS.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => handleGenerate(f.value)}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <span className="block text-sm font-medium text-slate-800">{f.label}</span>
                      <span className="block text-xs text-slate-400">{f.hint}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg whitespace-nowrap transition-colors"
            >
              Escanear cámara
            </button>

            <button
              type="button"
              onClick={pickDemoBarcode}
              title="Rota aleatoriamente entre Ibuprofeno, Paracetamol y Vitamina C"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm rounded-lg whitespace-nowrap transition-colors"
            >
              Simular escaneo
            </button>
          </div>

          {/* Cantidad + Tipo */}
          <div className="flex gap-2">
            <input
              className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
            />
            <select
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={type}
              onChange={e => setType(e.target.value as 'IN' | 'OUT')}
            >
              <option value="IN">Entrada</option>
              <option value="OUT">Salida</option>
            </select>
          </div>

          {/* Lote + Fecha (solo Entrada) */}
          {type === 'IN' && (
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nro. lote"
                value={lotNumber}
                onChange={e => setLotNumber(e.target.value)}
                required
              />
              <input
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors"
          >
            {loading ? 'Procesando…' : 'Confirmar escaneo'}
          </button>
        </form>

        {result && (
          <div className="mt-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
            ✓ <strong>{result.productName}</strong> — {result.type === 'IN' ? '+' : '-'}{result.quantity} ud.
            &nbsp;|&nbsp; Stock disponible: <strong>{result.stockAfter}</strong>
          </div>
        )}
        {error && (
          <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </section>

      {showModal && (
        <CreateProductModal
          barcode={modalBarcode}
          onCreated={handleProductCreated}
          onCancel={handleModalCancel}
        />
      )}

      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Escanear producto</h3>
              </div>
              <button
                type="button"
                onClick={closeScanner}
                className="p-1 text-2xl leading-none text-slate-400 hover:text-slate-600"
                aria-label="Cerrar escáner"
              >
                ×
              </button>
            </div>

            <div className="bg-slate-950 p-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-emerald-400/60 bg-black">
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                />
                <div className="pointer-events-none absolute inset-10 rounded-2xl border-2 border-emerald-400 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
              </div>
            </div>

            <div className="space-y-3 px-5 py-4">
              <p className="text-sm text-slate-600">{scannerStatus}</p>
              {scannerError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {scannerError}
                  <br />
                  Si estás en celular, abre la app como <strong>localhost</strong> usando USB reverse o usa HTTPS.
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeScanner}
                  className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeScanner();
                    pickDemoBarcode();
                  }}
                  className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Usar demo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {entryModal && (
        <SuccessModal
          title="¡Entrada registrada!"
          details={[
            { label: 'Producto',     value: entryModal.productName },
            { label: 'Cantidad',     value: `+${entryModal.quantity} ud.` },
            { label: 'Lote',         value: entryModal.lotNumber || '—' },
            { label: 'Stock total',  value: entryModal.stockAfter },
          ]}
          onClose={() => { setEntryModal(null); onSuccess(); }}
        />
      )}

      {toast && (
        <div
          key={toast.id}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 bg-slate-900 text-white text-sm rounded-xl shadow-lg animate-fade-in"
        >
          <span className="text-emerald-400 text-base">✓</span>
          {toast.message}
        </div>
      )}
    </>
  );
}
