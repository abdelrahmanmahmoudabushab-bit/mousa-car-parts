import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, Volume2, CheckCircle, Keyboard } from 'lucide-react';
import { parseSmartSerialNumber } from '../utils/documentParser';

export default function QrScannerModal({ onClose, onScanSuccess, title = 'ماسح الباركود الخطي وسيريال القطعة 📷' }) {
  const [scanResult, setScanResult] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const scannerRef = useRef(null);

  // Web Audio API beep sound for instant cashier feedback
  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz A5 pitch
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15); // 150ms beep
    } catch (e) {
      // Audio fallback
    }
  };

  useEffect(() => {
    const scannerId = 'html5-qrcode-reader';
    const html5Qrcode = new Html5Qrcode(scannerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E
      ]
    });
    scannerRef.current = html5Qrcode;

    const config = {
      fps: 20, // Ultra-fast 20 FPS scanning
      qrbox: { width: 300, height: 120 }, // Rectangular target for linear barcodes
      aspectRatio: 1.0
    };

    html5Qrcode.start(
      { facingMode: 'environment' }, // Default rear camera on mobile
      config,
      (decodedText) => {
        const cleanSerial = parseSmartSerialNumber(decodedText) || decodedText;
        playBeepSound();
        setScanResult(cleanSerial);
        setIsScanning(false);
        if (onScanSuccess) {
          onScanSuccess(cleanSerial);
        }
        // Auto close after brief success confirmation
        setTimeout(() => {
          html5Qrcode.stop().catch(() => {}).finally(() => {
            onClose();
          });
        }, 500);
      },
      (error) => {
        // Scanning errors are expected while frame searching
      }
    ).catch(err => {
      console.warn('Camera access error:', err);
      setErrorMessage('تعذر تشغيل كاميرا الجهاز. يرجى السماح لصلاحيات الكاميرا أو استخدام أدناه للإدخال اليدوي.');
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const clean = parseSmartSerialNumber(manualCode.trim()) || manualCode.trim();
    playBeepSound();
    onScanSuccess(clean);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.85)', zIndex: 200 }}>
      <div className="modal-content" style={{ maxWidth: '480px', borderRadius: '24px', padding: '1.25rem', fontFamily: "'Cairo', sans-serif" }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#d97706', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)' }}>
              <Camera size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                {title}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>
                وجه الكاميرا نحو الباركود الخطي (سيريال القطعة) - تم تعطيل مسح الـ QR لتفادي الأخطاء
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(() => {}).finally(() => onClose());
              } else {
                onClose();
              }
            }}
            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.4rem', color: '#475569', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Camera Container */}
        <div style={{ position: 'relative', width: '100%', background: '#000000', borderRadius: '18px', overflow: 'hidden', minHeight: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          <div id="html5-qrcode-reader" style={{ width: '100%', height: '100%' }}></div>

          {/* Scan Target Overlay Line */}
          {isScanning && !errorMessage && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '300px', height: '110px', border: '3px dashed #d97706', borderRadius: '12px', boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: '2px', background: '#d97706', boxShadow: '0 0 8px #d97706', animation: 'pulse 1.2s infinite' }}></div>
              </div>
            </div>
          )}

          {/* Success Overlay */}
          {scanResult && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(5, 150, 105, 0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ffffff', gap: '0.5rem', zIndex: 10 }}>
              <CheckCircle size={56} />
              <div style={{ fontSize: '1.25rem', fontWeight: '900' }}>تم مسح الكود بنجاح!</div>
              <div style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)', fontWeight: '800', background: 'rgba(0,0,0,0.2)', padding: '0.35rem 1rem', borderRadius: '10px' }}>
                {scanResult}
              </div>
            </div>
          )}
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div style={{ marginTop: '0.85rem', padding: '0.75rem', background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', borderRadius: '12px', fontSize: '0.82rem', fontWeight: '700', textAlign: 'center' }}>
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Manual Fallback Input */}
        <form onSubmit={handleManualSubmit} style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Keyboard size={18} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="أو أدخل كود OEM يدوياً هنا..."
              style={{
                width: '100%',
                height: '44px',
                paddingRight: '2.5rem',
                paddingLeft: '0.75rem',
                fontSize: '0.88rem',
                fontWeight: '700',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontFamily: "'Cairo', sans-serif"
              }}
            />
          </div>
          <button type="submit" className="btn-sand" style={{ height: '44px', padding: '0 1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '800' }}>
            تأكيد 📥
          </button>
        </form>
      </div>
    </div>
  );
}
