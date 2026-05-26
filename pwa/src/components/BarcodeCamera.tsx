/**
 * BarcodeCamera — visor de escaneo real via cámara del dispositivo.
 *
 * Usa QuaggaJS (@ericblade/quagga2) para decodificar códigos EAN-13,
 * EAN-8 y Code128 en tiempo real desde la cámara trasera.
 *
 * Al detectar un código válido:
 *   1. Detiene la cámara
 *   2. Llama onDetected(code) para rellenar el campo de la UI
 *   3. Vibra el teléfono 200 ms como confirmación táctil
 */
import { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export function BarcodeCamera({ onDetected, onClose }: Props) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
  const [errorMsg, setErrorMsg] = useState('');
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;

    if (!scannerRef.current) return;

    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: scannerRef.current,
          constraints: {
            facingMode: 'environment',   // cámara trasera
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        locator: {
          patchSize: 'medium',
          halfSample: true,
        },
        numOfWorkers: 2,
        frequency: 10,
        decoder: {
          readers: ['ean_reader', 'ean_8_reader', 'code_128_reader'],
        },
        locate: true,
      },
      (err: unknown) => {
        if (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setErrorMsg(`No se pudo acceder a la cámara: ${msg}`);
          setStatus('error');
          return;
        }
        if (!stoppedRef.current) {
          Quagga.start();
          setStatus('scanning');
        }
      },
    );

    // Deduplicación: ignorar el mismo código en menos de 1.5 s
    let lastCode = '';
    let lastTime = 0;

    const handleDetected = (result: { codeResult: { code: string | null; format?: string } }) => {
      const code = result.codeResult.code;
      if (!code) return;
      const now = Date.now();
      if (code === lastCode && now - lastTime < 1500) return;
      lastCode = code;
      lastTime = now;

      // ── DEBUG TEMPORAL ──────────────────────────────────────────────
      console.log('[BarcodeCamera] código detectado:', {
        code,
        format: result.codeResult.format,
        length: code.length,
        charCodes: Array.from(code).map(c => c.charCodeAt(0)),
        repr: JSON.stringify(code),   // muestra caracteres no imprimibles escapados
      });
      // ────────────────────────────────────────────────────────────────

      // Vibración como confirmación
      if (typeof navigator.vibrate === 'function') navigator.vibrate(200);

      stopCamera();
      onDetected(code);
    };

    Quagga.onDetected(handleDetected);

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopCamera() {
    if (!stoppedRef.current) {
      stoppedRef.current = true;
      try { Quagga.offDetected(); } catch { /* ya estaba detenido */ }
      try { Quagga.stop(); } catch { /* ya estaba detenido */ }
    }
  }

  function handleClose() {
    stopCamera();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between py-6">
      {/* Título */}
      <div className="text-center px-4">
        <p className="text-white font-semibold text-lg">Escanear código de barras</p>
        <p className="text-slate-400 text-sm mt-1">
          {status === 'starting' && 'Iniciando cámara…'}
          {status === 'scanning' && 'Apunta al código de barras'}
          {status === 'error' && 'Error de cámara'}
        </p>
      </div>

      {/* Visor */}
      <div className="relative w-full max-w-sm mx-auto flex-1 flex items-center justify-center px-4">
        {status === 'error' ? (
          <div className="px-6 py-4 bg-red-900/80 border border-red-500 rounded-xl text-red-200 text-sm text-center">
            {errorMsg}
            <p className="mt-2 text-red-300 text-xs">
              Asegúrate de que el navegador tiene permiso de cámara y de que accedes por HTTPS o localhost.
            </p>
          </div>
        ) : (
          <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl">
            {/* QuaggaJS monta <video> + <canvas> aquí */}
            <div ref={scannerRef} className="w-full" style={{ minHeight: 300 }} />

            {/* Guías de esquina */}
            <div className="absolute inset-6 pointer-events-none">
              {/* Esquina superior-izquierda */}
              <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              {/* Esquina superior-derecha */}
              <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              {/* Esquina inferior-izquierda */}
              <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              {/* Esquina inferior-derecha */}
              <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
            </div>

            {/* Línea de escaneo animada */}
            {status === 'scanning' && (
              <div
                className="absolute left-8 right-8 h-0.5 bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.7)] pointer-events-none"
                style={{
                  animation: 'scanLine 2s ease-in-out infinite',
                  top: '30%',
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Botón cerrar */}
      <button
        onClick={handleClose}
        className="mt-4 px-8 py-3 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-semibold rounded-2xl transition-colors border border-white/20"
      >
        Cerrar cámara
      </button>

      {/* Keyframe de la línea de escaneo (inyectado inline) */}
      <style>{`
        @keyframes scanLine {
          0%   { top: 25%; opacity: 1; }
          50%  { top: 70%; opacity: 0.8; }
          100% { top: 25%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
