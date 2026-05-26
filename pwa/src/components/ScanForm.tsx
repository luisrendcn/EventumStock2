import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api, ScanOutput } from '../api/client';
import { CreateProductModal } from './CreateProductModal';
import { SuccessModal } from './SuccessModal';
import { BarcodeFormat, generateBarcode } from '../utils/barcodeGenerator';
import { BarcodeCamera } from './BarcodeCamera';

const DEMO_BARCODES = [
  { code: '5901234123457', label: 'Ibuprofeno' },
  { code: '4006381333931', label: 'Paracetamol' },
  { code: '8410032800018', label: 'Vitamina C' },
];

const FORMATS: { value: BarcodeFormat; label: string; hint: string }[] = [
  { value: 'EAN-13', label: 'EAN-13', hint: '13 dígitos' },
  { value: 'EAN-8',  label: 'EAN-8',  hint: '8 dígitos' },
  { value: 'Code128', label: 'Code128', hint: 'Alfanumérico' },
];

// Clases reutilizables — touch-friendly, no-zoom en iOS (font ≥ 16px)
const INPUT_BASE =
  'w-full px-4 text-base min-h-[48px] border rounded-xl ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors duration-700';
const BTN_SECONDARY =
  'flex items-center justify-center gap-1.5 px-4 min-h-[48px] text-sm font-medium ' +
  'rounded-xl whitespace-nowrap transition-colors active:scale-95';

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

type ToastState = { message: string; id: number; fromMobile?: boolean } | null;

/**
 * Extrae el código de barras real de la salida del escáner.
 * Soporta: cadena plana, JSON {"barcode":"…"}, URL ?barcode=…
 */
function extractBarcodeFromScan(rawValue: string): string {
  const value = rawValue.trim();

  try {
    const parsed = JSON.parse(value) as { barcode?: unknown; code?: unknown; productCode?: unknown };
    const candidate = parsed.barcode ?? parsed.code ?? parsed.productCode;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  } catch { /* código plano — lo normal */ }

  try {
    const url = new URL(value);
    const candidate = url.searchParams.get('barcode') ?? url.searchParams.get('code');
    if (candidate?.trim()) return candidate.trim();
  } catch { /* no es URL */ }

  return value;
}

/** Constante evaluada una sola vez al cargar el módulo — no cambia en runtime */
const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export function ScanForm({ onSuccess }: Props) {
  const [barcode, setBarcode]           = useState('');
  const [quantity, setQuantity]         = useState(1);
  const [type, setType]                 = useState<'IN' | 'OUT'>('IN');
  const [lotNumber, setLotNumber]       = useState('L001');
  const [expiryDate, setExpiryDate]     = useState('2026-12-31');
  const [result, setResult]             = useState<ScanOutput | null>(null);
  const [entryModal, setEntryModal]     = useState<ScanOutput & { lotNumber: string } | null>(null);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [cameraOpen, setCameraOpen]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [modalBarcode, setModalBarcode] = useState('');

  // ── Estado WebSocket ───────────────────────────────────────────────────────
  const [wsConnected, setWsConnected]     = useState(false);
  const [barcodeFlash, setBarcodeFlash]   = useState(false); // animación campo verde
  const socketRef                          = useRef<Socket | null>(null);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast]   = useState<ToastState>(null);
  const toastTimer           = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer           = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const pendingScan = useRef<ScanParams | null>(null);

  function showToast(message: string, fromMobile = false) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, id: Date.now(), fromMobile });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  function flashBarcodeField() {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setBarcodeFlash(true);
    flashTimer.current = setTimeout(() => setBarcodeFlash(false), 2000);
  }

  // ── Socket.IO: conectar al montar, desconectar al desmontar ───────────────
  useEffect(() => {
    // Conecta al mismo host que sirve la PWA; Vite proxy redirige /socket.io → backend
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setWsConnected(true);
      console.log('[WS] Conectado al backend:', socket.id);
    });

    socket.on('disconnect', () => {
      setWsConnected(false);
      console.log('[WS] Desconectado');
    });

    // ── Recibir barcode desde el móvil ─────────────────────────────────────
    socket.on('barcode:scanned', (data: { barcode: string; deviceId?: string }) => {
      console.log('[WS] barcode:scanned recibido:', data);
      setBarcode(data.barcode);
      flashBarcodeField();
      showToast(`📱 Código recibido desde móvil: ${data.barcode}`, true);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup timers ─────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  // ── Cerrar dropdown al hacer clic fuera ────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
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

  async function executeScan(params: ScanParams): Promise<ScanOutput> {
    return api.scan(params);
  }

  function buildScanParams(scannedBarcode = barcode): ScanParams {
    return {
      barcode: scannedBarcode,
      quantity,
      type,
      ...(type === 'IN' ? { lotNumber, expiryDate } : {}),
    };
  }

  async function processScan(params: ScanParams) {
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const out = await executeScan(params);
      if (out.type === 'IN') {
        setEntryModal({ ...out, lotNumber: params.lotNumber ?? '' });
      } else {
        setResult(out);
      }
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('no encontrado') || message.toLowerCase().includes('not found')) {
        pendingScan.current = params;
        setModalBarcode(params.barcode);
        setShowModal(true);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await processScan(buildScanParams());
  }

  async function handleProductCreated(_productId: string) {
    setShowModal(false);
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

  // ── Clase dinámica del campo barcode (flash verde al recibir desde móvil) ──
  const inputClass = [
    INPUT_BASE,
    barcodeFlash
      ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400'
      : 'border-slate-300',
  ].join(' ');

  return (
    <>
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">

        {/* ── Header con indicador WebSocket ── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">Escaneo de Inventario</h2>
          <span
            title={wsConnected ? 'WebSocket conectado' : 'WebSocket desconectado'}
            className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${
              wsConnected
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            {wsConnected ? 'Live' : 'Offline'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">

          {/* ── Fila 1: Código de barras (ancho completo) ── */}
          <div className="relative">
            <input
              className={inputClass}
              placeholder="Código de barras"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              required
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              inputMode="text"
            />
            {barcodeFlash && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-semibold animate-pulse">
                📱
              </span>
            )}
          </div>

          {/* ── Fila 2: Botones de acción ── */}
          {/* Móvil: 3 columnas [Cámara | Generar | Simular]  */}
          {/* Desktop: 2 columnas [Generar | Simular]          */}
          <div className={`grid gap-2 ${IS_MOBILE ? 'grid-cols-3' : 'grid-cols-2'}`}>

            {/* Cámara QuaggaJS — solo visible en móvil */}
            {IS_MOBILE && (
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className={`${BTN_SECONDARY} bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white`}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>Cámara</span>
              </button>
            )}

            {/* Generar código de prueba (dropdown) */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(o => !o)}
                className={`${BTN_SECONDARY} w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200`}
              >
                Generar código
                <svg
                  className={`w-3.5 h-3.5 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                  <p className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Formato
                  </p>
                  {FORMATS.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => handleGenerate(f.value)}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                    >
                      <span className="block text-sm font-medium text-slate-800">{f.label}</span>
                      <span className="block text-xs text-slate-400">{f.hint}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Simular */}
            <button
              type="button"
              onClick={pickDemoBarcode}
              title="Rota aleatoriamente entre Ibuprofeno, Paracetamol y Vitamina C"
              className={`${BTN_SECONDARY} bg-slate-100 hover:bg-slate-200 text-slate-600`}
            >
              Simular
            </button>
          </div>

          {/* ── Fila 3: Cantidad + Tipo ── */}
          <div className="flex gap-2">
            <input
              className={`${INPUT_BASE} flex-none border-slate-300`}
              style={{ width: '5.5rem' }}
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
            />
            <select
              className={`${INPUT_BASE} flex-1 border-slate-300`}
              value={type}
              onChange={e => setType(e.target.value as 'IN' | 'OUT')}
            >
              <option value="IN">↑ Entrada</option>
              <option value="OUT">↓ Salida</option>
            </select>
          </div>

          {/* ── Fila 4: Lote + Fecha vencimiento (solo Entrada) ── */}
          {type === 'IN' && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className={`${INPUT_BASE} sm:flex-1 border-slate-300`}
                placeholder="Nro. lote"
                value={lotNumber}
                onChange={e => setLotNumber(e.target.value)}
                required
              />
              <input
                className={`${INPUT_BASE} sm:flex-1 border-slate-300`}
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                required
              />
            </div>
          )}

          {/* ── Confirmar ── */}
          <button
            type="submit"
            disabled={loading}
            className="min-h-[48px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold text-base rounded-xl transition-colors"
          >
            {loading ? 'Procesando…' : 'Confirmar escaneo'}
          </button>
        </form>

        {result && (
          <div className="mt-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
            ✓ <strong>{result.productName}</strong> — {result.type === 'IN' ? '+' : '-'}{result.quantity} ud.
            &nbsp;|&nbsp; Stock disponible: <strong>{result.stockAfter}</strong>
          </div>
        )}
        {error && (
          <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}
      </section>

      {/* Modal: crear producto nuevo cuando el barcode no existe */}
      {showModal && (
        <CreateProductModal
          barcode={modalBarcode}
          onCreated={handleProductCreated}
          onCancel={handleModalCancel}
        />
      )}

      {/* Modal: confirmación de entrada */}
      {entryModal && (
        <SuccessModal
          title="¡Entrada registrada!"
          details={[
            { label: 'Producto',    value: entryModal.productName },
            { label: 'Cantidad',    value: `+${entryModal.quantity} ud.` },
            { label: 'Lote',        value: entryModal.lotNumber || '—' },
            { label: 'Stock total', value: entryModal.stockAfter },
          ]}
          onClose={() => { setEntryModal(null); onSuccess(); }}
        />
      )}

      {/* Toast — estilo diferente si viene desde el móvil */}
      {toast && (
        <div
          key={toast.id}
          className={`fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-auto z-50
            flex items-center gap-3 px-5 py-3 text-sm rounded-xl shadow-lg
            ${toast.fromMobile
              ? 'bg-emerald-800 text-white ring-2 ring-emerald-400'
              : 'bg-slate-900 text-white'
            }`}
        >
          <span className="text-base">{toast.fromMobile ? '📱' : '✓'}</span>
          {toast.message}
        </div>
      )}

      {/* Visor de cámara — QuaggaJS (solo en móvil) */}
      {cameraOpen && (
        <BarcodeCamera
          onDetected={async (code) => {
            const extracted = extractBarcodeFromScan(code);
            setBarcode(extracted);
            setCameraOpen(false);
            showToast(`Código escaneado: ${extracted}`);

            // Enviar al desktop vía WebSocket (fire-and-forget)
            try {
              const result = await api.broadcastBarcode(extracted, 'iphone');
              console.log(`[WS] Barcode enviado al desktop (${result.recipients} receptor/es)`);
              showToast(`Código enviado al desktop ✓`);
            } catch (err) {
              console.warn('[WS] No se pudo enviar al desktop:', err);
            }
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </>
  );
}
