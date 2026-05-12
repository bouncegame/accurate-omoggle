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
        'relative aspect-square w-full overflow-hidden border border-ink-400 bg-ink-950',
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
          className="pointer-events-none absolute inset-x-0 h-px bg-mog-500"
          initial={{ y: 0 }}
          animate={{ y: '100%' }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
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
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 border border-ink-400 bg-ink-950 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-100">
          <span className="inline-block size-1.5 bg-mog-500" />
          {label}
        </div>
      )}

      {/* score badge */}
      {showScore && status === 'ready' && (
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
          <div className="border border-ink-400 bg-ink-950 px-3 py-2">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-300">
              live score
            </div>
            <div
              className="font-mono text-3xl font-extrabold leading-none tabular-nums"
              style={{ color: tier.color }}
            >
              {faceDetected ? score.toFixed(2) : '--'}
            </div>
          </div>
          <div className="border border-ink-400 bg-ink-950 px-3 py-2 text-right">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-300">status</div>
            <div
              className="font-mono text-xs font-bold uppercase tracking-[0.14em]"
              style={{ color: faceDetected ? 'var(--color-mog-500)' : '#ffaa00' }}
            >
              {faceDetected ? 'locked' : 'searching'}
            </div>
          </div>
        </div>
      )}

      {/* status overlays */}
      {status === 'idle' && (
        <button
          type="button"
          onClick={() => void start()}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950 transition-colors hover:bg-ink-900"
        >
          <div className="border border-mog-500 bg-ink-900 p-4">
            <ScanFace className="size-7 text-mog-500" />
          </div>
          <div className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-mog-500">
            start face scan
          </div>
          <div className="max-w-[260px] px-6 text-center font-mono text-[10px] text-ink-300">
            we'll request your camera and run detection locally in your browser.
          </div>
        </button>
      )}

      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950">
          <Loader2 className="size-6 animate-spin text-mog-500" />
          <div className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink-200">
            loading detector
          </div>
        </div>
      )}

      {(status === 'error' || status === 'no-permission') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950 p-6 text-center">
          <div className="border border-blood-500 bg-ink-900 p-3">
            <CameraOff className="size-5 text-blood-500" />
          </div>
          <div className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-blood-500">
            camera unavailable
          </div>
          <div className="max-w-[260px] font-mono text-[10px] text-ink-300">{errorMsg}</div>
          <button
            type="button"
            onClick={() => void start()}
            className="btn-ghost text-xs"
          >
            <Camera className="size-3.5" /> try again
          </button>
        </div>
      )}
    </div>
  )
})

function CornerBracket({ pos, active }: { pos: 'tl' | 'tr' | 'bl' | 'br'; active: boolean }) {
  const base =
    'pointer-events-none absolute size-7 border-mog-500 transition-opacity duration-200'
  const map = {
    tl: 'left-3 top-3 border-l-2 border-t-2',
    tr: 'right-3 top-3 border-r-2 border-t-2',
    bl: 'left-3 bottom-3 border-l-2 border-b-2',
    br: 'right-3 bottom-3 border-r-2 border-b-2',
  } as const
  return (
    <div className={cn(base, map[pos], active ? 'opacity-100' : 'opacity-30')} />
  )
}

function scoreTier(score: number): { color: string } {
  if (score < 3) return { color: '#a8a8a8' }
  if (score < 5) return { color: '#ff2052' }
  if (score < 6.5) return { color: '#ffaa00' }
  if (score < 8) return { color: '#a3ff12' }
  return { color: '#ff007a' }
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
  ctx.fillStyle = 'rgba(163,255,18,0.65)'
  for (let i = 0; i < landmarks.length; i += 3) {
    const p = landmarks[i]!
    ctx.beginPath()
    ctx.arc(p.x * canvas.width, p.y * canvas.height, 1.1, 0, Math.PI * 2)
    ctx.fill()
  }
  // a few connection lines for a clean wireframe look
  ctx.strokeStyle = 'rgba(163,255,18,0.35)'
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
