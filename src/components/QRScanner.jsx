import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

const CODE_RE = /WAY-\d{4}/i

// Reads a trip QR with the phone camera (BarcodeDetector, built into Chrome / Android WebView).
export default function QRScanner({ onCode, onClose }) {
  const video = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let stream
    let raf
    let stopped = false
    const run = async () => {
      if (!('BarcodeDetector' in window)) {
        setError('This phone can’t scan QR codes here. Type the code instead.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      } catch {
        setError('Camera permission is needed to scan. You can type the code instead.')
        return
      }
      if (stopped) return
      video.current.srcObject = stream
      await video.current.play().catch(() => {})
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      const scan = async () => {
        if (stopped) return
        try {
          const codes = await detector.detect(video.current)
          const hit = codes.map((c) => c.rawValue.match(CODE_RE)?.[0]).find(Boolean)
          if (hit) {
            navigator.vibrate?.(60)
            onCode(hit.toUpperCase())
            return
          }
        } catch {
          /* frame not ready */
        }
        raf = setTimeout(scan, 250)
      }
      scan()
    }
    run()
    return () => {
      stopped = true
      clearTimeout(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onCode])

  return (
    <div className="absolute inset-0 z-[1600] flex flex-col items-center justify-center bg-black text-white">
      <video ref={video} playsInline muted className="absolute inset-0 h-full w-full object-cover opacity-80" />
      <div className="relative h-64 w-64 rounded-3xl border-4 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
      <p className="relative mt-6 max-w-[280px] text-center text-[15px] font-bold">{error || 'Point at the trip QR code'}</p>
      <button onClick={onClose} className="relative mt-6 flex items-center gap-2 rounded-full bg-white/20 px-6 py-3 text-[15px] font-bold backdrop-blur">
        <X size={18} /> Close
      </button>
    </div>
  )
}
