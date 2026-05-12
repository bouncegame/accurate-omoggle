import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import { motion } from 'framer-motion'
import { loadFaceLandmarker } from '@/lib/face/detector'
import { scoreFace, ScoreSmoother, type ScoreBreakdown } from '@/lib/face/score'
import type { FaceLandmark } from '@/lib/face/landmarks'
import { Camera, CameraOff, Loader2, ScanFace } from 'lucide-react'
import { cn } from '@/lib/cn'

export type FaceScannerHandle = {
  getStream: () => MediaStream | null
  getCurrentScore: () => number
  getBreakdown: () => ScoreBreakdown | null
}

type Props = {
  onScore?: (score: number, breakdown: ScoreBreakdown) => void
  onStream?: (stream: MediaStream) => void
  mirror?: boolean
  className?: string
  /** When true, show the live numeric score readout on the video. */
  showScore?: boolean
  /** When true, render the face mesh overlay. */
  showMesh?: boolean
  /** Auto-start the camera on mount. */
  autoStart?: boolean
  label?: string
}

export const FaceScanner = forwardRef<FaceScannerHandle, Props>(function FaceScanner(
  {
    onScore,
    onStream,
    mirror = true,
    className,
    showScore = true,
    showMesh = true,
    autoStart = false,
    label,
  },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const smootherRef = useRef(new ScoreSmoother(0.18))
  const breakdownRef = useRef<ScoreBreakdown | null>(null)
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error' | 'no-permission'
  >('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [score, setScore] = useState<number>(0)
  const [faceDetected, setFaceDetected] = useState(false)

  useImperativeHandle(ref, () => ({
    getStream: () => streamRef.current,
    getCurrentScore: () => smootherRef.current.get(),
    getBreakdown: () => breakdownRef.current,
  }))

  const stop = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop()
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    smootherRef.current.reset()
    setStatus('idle')
    setFaceDetected(false)
    setScore(0)
  }

  const start = async () => {
    if (status === 'loading' || status === 'ready') return
    setStatus('loading')
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 720 },
          height: { ideal: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 },
        },
        audio: true,
      })
      streamRef.current = stream
      onStream?.(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }

      const landmarker = await loadFaceLandmarker()
      setStatus('ready')

      const loop = () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || video.readyState < 2) {
          rafRef.current = requestAnimationFrame(loop)
          return
        }
        try {
          const res = landmarker.detectForVideo(video, performance.now())
          if (res.faceLandmarks && res.faceLandmarks.length > 0) {
            setFaceDetected(true)
            const lm = res.faceLandmarks[0]! as FaceLandmark[]
            const breakdown = scoreFace(lm)
            breakdownRef.current = breakdown
            const smoothed = smootherRef.current.push(breakdown.total)
            setScore(smoothed)
            onScore?.(smoothed, breakdown)

            if (showMesh && canvas) {
              drawMesh(canvas, video, lm, mirror)
            }
          } else {
            setFaceDetected(false)
            if (canvas) {
              const ctx = canvas.getContext('2d')
              if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
            }
          }
        } catch {
          /* detector race during teardown */
        }
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    } catch (err) {
      const error = err as Error & { name?: string }
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setStatus('no-permission')
        setErrorMsg('Camera permission denied. Allow access in your browser to continue.')
      } else {
        setStatus('error')
        setErrorMsg(error.message || 'Could not start the camera.')
      }
    }
  }

  useEffect(() => {
    if (autoStart) void start()
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tier = scoreTier(score)

  return (
    <div
      className={cn(
        'relative aspect-square w-full overflow-hidden rounded-2xl bg-ink-900 ring-1 ring-white/5',
        className,
      )}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        className={cn(
          'absolute inset-0 size-full object-cover',
          mirror && 'scale-x-[-1]',
        )}
      />
      {showMesh && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 size-full"
          width={720}
          height={720}
        />
      )}

      {/* scan line */}
      {status === 'ready' && faceDetected && (
        <motion.div
          className="pointer-events-none absolute inset-x-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(110,231,183,0.9) 50%, transparent 100%)',
            boxShadow: '0 0 16px 2px rgba(110,231,183,0.7)',
          }}
          initial={{ y: 0 }}
          animate={{ y: '100%' }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* corners */}
      {status === 'ready' && (
        <>
          <CornerBracket pos="tl" active={faceDetected} />
          <CornerBracket pos="tr" active={faceDetected} />
          <CornerBracket pos="bl" active={faceDetected} />
          <CornerBracket pos="br" active={faceDetected} />
        </>
      )}

      {/* label */}
      {label && (
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-ink-100 ring-1 ring-white/10 backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-mog-400" />
          {label}
        </div>
      )}

      {/* score badge */}
      {showScore && status === 'ready' && (
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
          <div
            className="rounded-xl bg-black/55 px-3 py-2 backdrop-blur-md ring-1 ring-white/10"
            style={{ boxShadow: `0 0 30px -4px ${tier.glow}` }}
          >
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink-300">
              Live Score
            </div>
            <div className="font-display text-3xl font-bold leading-none tabular-nums" style={{ color: tier.color }}>
              {faceDetected ? score.toFixed(2) : '--'}
            </div>
          </div>
          <div className="rounded-xl bg-black/55 px-3 py-2 text-right backdrop-blur-md ring-1 ring-white/10">
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink-300">Status</div>
            <div className="text-xs font-semibold" style={{ color: faceDetected ? '#6ee7b7' : '#f59e0b' }}>
              {faceDetected ? 'Locked' : 'Searching…'}
            </div>
          </div>
        </div>
      )}

      {/* status overlays */}
      {status === 'idle' && (
        <button
          type="button"
          onClick={() => void start()}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/70 transition-colors hover:bg-ink-950/60"
        >
          <div className="rounded-full bg-mog-500/10 p-4 ring-1 ring-mog-500/30">
            <ScanFace className="size-8 text-mog-300" />
          </div>
          <div className="text-sm font-medium text-ink-100">Start Face Scan</div>
          <div className="px-6 text-center text-xs text-ink-300">
            We'll request your camera and run the detection locally in your browser.
          </div>
        </button>
      )}

      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink-950/80">
          <Loader2 className="size-7 animate-spin text-mog-300" />
          <div className="text-xs text-ink-200">Loading detector…</div>
        </div>
      )}

      {(status === 'error' || status === 'no-permission') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/85 p-6 text-center">
          <div className="rounded-full bg-blood-500/15 p-3 ring-1 ring-blood-500/40">
            <CameraOff className="size-6 text-blood-500" />
          </div>
          <div className="text-sm font-medium text-ink-100">Camera unavailable</div>
          <div className="text-xs text-ink-300">{errorMsg}</div>
          <button
            type="button"
            onClick={() => void start()}
            className="btn-ghost text-xs"
          >
            <Camera className="size-3.5" /> Try Again
          </button>
        </div>
      )}
    </div>
  )
})

function CornerBracket({ pos, active }: { pos: 'tl' | 'tr' | 'bl' | 'br'; active: boolean }) {
  const base =
    'pointer-events-none absolute size-7 border-mog-300/80 transition-opacity duration-200'
  const map = {
    tl: 'left-3 top-3 border-l-2 border-t-2 rounded-tl-md',
    tr: 'right-3 top-3 border-r-2 border-t-2 rounded-tr-md',
    bl: 'left-3 bottom-3 border-l-2 border-b-2 rounded-bl-md',
    br: 'right-3 bottom-3 border-r-2 border-b-2 rounded-br-md',
  } as const
  return (
    <div
      className={cn(base, map[pos], active ? 'opacity-100' : 'opacity-30')}
      style={active ? { boxShadow: '0 0 12px 0 rgba(110,231,183,0.5)' } : undefined}
    />
  )
}

function scoreTier(score: number): { color: string; glow: string } {
  if (score < 3) return { color: '#9ca3af', glow: 'rgba(156,163,175,0.5)' }
  if (score < 5) return { color: '#f43f5e', glow: 'rgba(244,63,94,0.5)' }
  if (score < 6.5) return { color: '#f59e0b', glow: 'rgba(245,158,11,0.55)' }
  if (score < 8) return { color: '#10b981', glow: 'rgba(16,185,129,0.6)' }
  return { color: '#c084fc', glow: 'rgba(168,85,247,0.7)' }
}

// Lightweight mesh draw: pick a small set of "tesselation" edges from the
// 468-pt mesh by drawing a sparse triangulation that reads as a wireframe
// without flooding the canvas at 30fps.
function drawMesh(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  landmarks: FaceLandmark[],
  mirror: boolean,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const vw = video.videoWidth || 720
  const vh = video.videoHeight || 720
  if (canvas.width !== vw || canvas.height !== vh) {
    canvas.width = vw
    canvas.height = vh
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  if (mirror) {
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }
  // landmark points (sparse)
  ctx.fillStyle = 'rgba(110,231,183,0.55)'
  for (let i = 0; i < landmarks.length; i += 3) {
    const p = landmarks[i]!
    ctx.beginPath()
    ctx.arc(p.x * canvas.width, p.y * canvas.height, 1.1, 0, Math.PI * 2)
    ctx.fill()
  }
  // a few connection lines for a clean wireframe look
  ctx.strokeStyle = 'rgba(168,85,247,0.55)'
  ctx.lineWidth = 0.8
  const path = [
    // jaw
    [127, 234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454, 356],
    // outer eyes
    [33, 246, 161, 160, 159, 158, 157, 173, 133],
    [362, 398, 384, 385, 386, 387, 388, 466, 263],
    // mouth outline
    [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61],
    // brows
    [70, 63, 105, 66, 107],
    [336, 296, 334, 293, 300],
    // nose
    [168, 6, 197, 195, 5, 4, 1, 19, 94],
  ]
  for (const seq of path) {
    ctx.beginPath()
    for (let i = 0; i < seq.length; i++) {
      const p = landmarks[seq[i]!]
      if (!p) continue
      const x = p.x * canvas.width
      const y = p.y * canvas.height
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.restore()
}
