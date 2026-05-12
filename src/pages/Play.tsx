import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Crosshair,
  Crown,
  Loader2,
  PartyPopper,
  Skull,
  SkipForward,
  X,
} from 'lucide-react'
import { FaceScanner, type FaceScannerHandle } from '@/components/FaceScanner'
import { useAuth } from '@/store/auth'
import { rankFromMogX, type Rank } from '@/lib/ranks'
import { RankBadge } from '@/components/ui/RankBadge'
import { RankUpOverlay } from '@/components/ui/RankUpOverlay'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import {
  awardResult,
  claimPartner,
  leaveQueue,
  type ClaimResult,
} from '@/lib/match/matchmaker'
import { makeChannelName, PeerSession } from '@/lib/match/webrtc'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

type Stage = 'idle' | 'queue' | 'connecting' | 'live' | 'result' | 'error'

const ROUND_MS = 20_000

export function Play() {
  const { user, profile, refreshProfile } = useAuth()
  const scannerRef = useRef<FaceScannerHandle>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const peerRef = useRef<PeerSession | null>(null)
  const queuePollRef = useRef<number | null>(null)
  const heartbeatRef = useRef<number | null>(null)
  const roundDeadlineRef = useRef<number | null>(null)
  const scoreSendRef = useRef<number | null>(null)
  const finishedRef = useRef(false)

  const [stage, setStage] = useState<Stage>('idle')
  const [claim, setClaim] = useState<ClaimResult | null>(null)
  const [myScore, setMyScore] = useState(0)
  const [oppScore, setOppScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(ROUND_MS)
  const [remoteReady, setRemoteReady] = useState(false)
  const [result, setResult] = useState<null | {
    winner: 'me' | 'opp' | 'draw'
    mogxDelta: number
    newMogx: number
    prevRank: Rank
    nextRank: Rank
  }>(null)
  const [rankUp, setRankUp] = useState<Rank | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const cleanup = useCallback(async () => {
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }
    if (queuePollRef.current) {
      window.clearInterval(queuePollRef.current)
      queuePollRef.current = null
    }
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
    if (scoreSendRef.current) {
      window.clearInterval(scoreSendRef.current)
      scoreSendRef.current = null
    }
    setRemoteReady(false)
    if (supabaseConfigured) {
      try {
        await leaveQueue()
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      void cleanup()
    }
  }, [cleanup])

  const startQueue = async () => {
    if (!user || !profile) return
    finishedRef.current = false
    setResult(null)
    setMyScore(0)
    setOppScore(0)
    setTimeLeft(ROUND_MS)
    setStage('queue')
    setErrorMsg('')

    // make sure scanner has a stream
    const stream = scannerRef.current?.getStream()
    if (!stream) {
      toast({ kind: 'error', title: 'Camera not ready', description: 'Wait for the camera to load and grant permission.' })
      setStage('idle')
      return
    }

    if (!supabaseConfigured) {
      toast({ kind: 'error', title: 'Supabase not configured' })
      setStage('idle')
      return
    }

    const tempChannel = `match:waiting:${user.id}`

    try {
      const initial = await claimPartner(tempChannel)
      setClaim(initial)

      if (initial.partner_id) {
        await connect(initial, stream)
      } else {
        // wait for someone to pair with us
        startQueueWait()
      }
    } catch (err) {
      const e = err as Error
      setErrorMsg(e.message)
      setStage('error')
    }
  }

  const startQueueWait = () => {
    if (!user) return
    // Re-call the RPC every few seconds to refresh joined_at; also subscribe to
    // realtime so we know as soon as someone pairs us.

    const channelName = `match:waiting:${user.id}`
    const realtime = supabase.channel(`waitwatch:${user.id}`)
    realtime
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matchmaking_queue',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const row = payload.new as { paired_with?: string; channel?: string }
          if (row.paired_with) {
            await supabase.removeChannel(realtime)
            // Look up partner handle for nicer UI; non-blocking.
            const { data: partnerProfile } = await supabase
              .from('profiles')
              .select('handle, display_name, mogx')
              .eq('id', row.paired_with)
              .maybeSingle()
            const stream = scannerRef.current?.getStream()
            if (!stream) return
            await connect(
              {
                partner_id: row.paired_with,
                partner_handle: partnerProfile?.handle ?? 'opponent',
                channel: row.channel ?? channelName,
                is_initiator: false,
              },
              stream,
            )
          }
        },
      )
      .subscribe()

    heartbeatRef.current = window.setInterval(async () => {
      try {
        await claimPartner(channelName)
      } catch {
        /* ignore */
      }
    }, 5000)
  }

  const connect = async (info: ClaimResult, stream: MediaStream) => {
    if (!user || !info.partner_id) return
    setStage('connecting')
    setClaim(info)

    const channel =
      info.channel && info.channel.startsWith('match:waiting:')
        ? makeChannelName(user.id, info.partner_id)
        : info.channel || makeChannelName(user.id, info.partner_id)

    const peer = new PeerSession(user.id, info.partner_id, channel, info.is_initiator, {
      onRemoteStream: (s) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = s
          void remoteVideoRef.current.play().catch(() => {})
        }
      },
      onConnected: () => {
        startMatch()
      },
      onDisconnected: () => {
        if (!finishedRef.current && stage !== 'result') {
          handleDisconnect()
        }
      },
      onRemoteScore: (v) => setOppScore(v),
      onPeerReady: () => setRemoteReady(true),
      onPeerBye: () => {
        if (!finishedRef.current) handleDisconnect()
      },
    })
    peerRef.current = peer
    await peer.attachLocalStream(stream)
    try {
      await peer.start()
    } catch (err) {
      const e = err as Error
      setErrorMsg(e.message)
      setStage('error')
    }
  }

  const startMatch = () => {
    if (stage === 'live' || finishedRef.current) return
    setStage('live')
    roundDeadlineRef.current = Date.now() + ROUND_MS

    // tick down the timer
    const tick = window.setInterval(() => {
      const dl = roundDeadlineRef.current
      if (!dl) {
        window.clearInterval(tick)
        return
      }
      const left = dl - Date.now()
      setTimeLeft(Math.max(0, left))
      const cur = scannerRef.current?.getCurrentScore() ?? 0
      setMyScore(cur)
      if (left <= 0) {
        window.clearInterval(tick)
        void finishMatch()
      }
    }, 100)

    // push my score over the data channel every 250ms
    scoreSendRef.current = window.setInterval(() => {
      const v = scannerRef.current?.getCurrentScore() ?? 0
      peerRef.current?.sendScore(v)
    }, 250)
  }

  const finishMatch = async () => {
    if (finishedRef.current) return
    finishedRef.current = true
    if (scoreSendRef.current) {
      window.clearInterval(scoreSendRef.current)
      scoreSendRef.current = null
    }

    const opponentId = peerRef.current?.getPeerId() ?? claim?.partner_id ?? null
    const my = scannerRef.current?.getCurrentScore() ?? 0
    const opp = oppScore

    let mogxDelta = 0
    let newMogx = profile?.mogx ?? 0
    if (opponentId && profile) {
      try {
        const award = await awardResult(opponentId, my, opp, ROUND_MS)
        if (award) {
          mogxDelta = award.mogx_delta
          newMogx = award.new_mogx
        }
      } catch (err) {
        console.error(err)
      }
    }
    const prevRank = rankFromMogX(profile?.mogx ?? 0).current
    const nextRank = rankFromMogX(newMogx).current
    const winner: 'me' | 'opp' | 'draw' =
      Math.abs(my - opp) < 0.05 ? 'draw' : my > opp ? 'me' : 'opp'

    setResult({ winner, mogxDelta, newMogx, prevRank, nextRank })
    setStage('result')

    if (prevRank.key !== nextRank.key && newMogx >= nextRank.threshold) {
      setRankUp(nextRank)
    }

    await refreshProfile()
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }
    if (supabaseConfigured) {
      try {
        await leaveQueue()
      } catch {
        /* ignore */
      }
    }
  }

  const handleDisconnect = async () => {
    if (finishedRef.current) return
    finishedRef.current = true
    setErrorMsg('Your opponent left the match.')
    setStage('error')
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }
    if (supabaseConfigured) {
      try {
        await leaveQueue()
      } catch {
        /* ignore */
      }
    }
  }

  const skip = async () => {
    await cleanup()
    finishedRef.current = false
    setStage('idle')
    setResult(null)
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-3xl font-extrabold uppercase tracking-tight md:text-4xl">
            {stage === 'live' ? 'live match' : stage === 'result' ? 'match result' : 'find a match'}
          </h1>
          <p className="mt-2 font-mono text-xs text-ink-300">
            {stage === 'idle' && 'camera previews locally. click queue to get paired with a stranger.'}
            {stage === 'queue' && 'looking for a worthy opponent…'}
            {stage === 'connecting' && 'establishing peer-to-peer video link…'}
            {stage === 'live' && 'whoever has the higher score when the clock hits zero takes the mogx.'}
            {stage === 'result' && 'match complete.'}
            {stage === 'error' && 'something went wrong.'}
          </p>
        </div>
        {profile && (
          <RankBadge rank={rankFromMogX(profile.mogx).current} size="md" />
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* MY side */}
        <div className="relative">
          <FaceScanner
            ref={scannerRef}
            autoStart
            mirror
            label={profile ? `you · @${profile.handle}` : 'you'}
          />
          <ScoreBar score={myScore} side="me" />
        </div>

        {/* OPPONENT side */}
        <div className="relative">
          <OpponentTile
            stage={stage}
            videoRef={remoteVideoRef}
            partnerHandle={claim?.partner_handle ?? null}
            queueAction={startQueue}
            remoteReady={remoteReady}
            errorMsg={errorMsg}
          />
          <ScoreBar score={oppScore} side="opp" muted={stage !== 'live' && stage !== 'result'} />
        </div>
      </div>

      {/* timer */}
      <AnimatePresence>
        {stage === 'live' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 flex items-center justify-center"
          >
            <div className="relative w-full max-w-md">
              <div className="text-center font-mono text-4xl font-extrabold tabular-nums text-white">
                {(timeLeft / 1000).toFixed(1)}<span className="text-ink-400">s</span>
              </div>
              <div className="mt-3 h-2 border border-ink-500 bg-ink-950">
                <div
                  className="h-full transition-[width] duration-100"
                  style={{
                    width: `${(timeLeft / ROUND_MS) * 100}%`,
                    background:
                      timeLeft < 5000
                        ? 'var(--color-blood-500)'
                        : 'var(--color-mog-500)',
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* action bar */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {stage === 'idle' && (
          <button onClick={() => void startQueue()} className="btn-primary">
            <Crosshair className="size-4" /> queue match
          </button>
        )}
        {(stage === 'queue' || stage === 'connecting') && (
          <button onClick={() => void skip()} className="btn-ghost">
            <X className="size-4" /> cancel
          </button>
        )}
        {stage === 'live' && (
          <button onClick={() => void finishMatch()} className="btn-ghost">
            <SkipForward className="size-4" /> end early
          </button>
        )}
        {(stage === 'result' || stage === 'error') && (
          <>
            <button onClick={() => void skip()} className="btn-primary">
              <Crosshair className="size-4" /> next match
            </button>
            <Link to="/app" className="btn-ghost">
              back to dashboard
            </Link>
          </>
        )}
      </div>

      <AnimatePresence>{stage === 'result' && result && <ResultModal r={result} />}</AnimatePresence>

      <RankUpOverlay rank={rankUp} onDone={() => setRankUp(null)} />
    </div>
  )
}

function ScoreBar({ score, side, muted }: { score: number; side: 'me' | 'opp'; muted?: boolean }) {
  const color = side === 'me' ? 'var(--color-mog-500)' : 'var(--color-chad-500)'
  return (
    <div className="mt-3 flex items-center gap-3">
      <span className="w-12 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-300">
        {side === 'me' ? 'you' : 'opp.'}
      </span>
      <div className="relative h-2 flex-1 border border-ink-500 bg-ink-950">
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-200"
          style={{ width: `${(score / 10) * 100}%`, background: color }}
        />
      </div>
      <span
        className={cn(
          'w-14 text-right font-mono text-sm font-bold tabular-nums',
          muted ? 'text-ink-400' : '',
        )}
        style={{ color: muted ? undefined : color }}
      >
        {score.toFixed(2)}
      </span>
    </div>
  )
}

function OpponentTile({
  stage,
  videoRef,
  partnerHandle,
  queueAction,
  remoteReady,
  errorMsg,
}: {
  stage: Stage
  videoRef: React.RefObject<HTMLVideoElement | null>
  partnerHandle: string | null
  queueAction: () => void
  remoteReady: boolean
  errorMsg: string
}) {
  return (
    <div className="relative aspect-square w-full overflow-hidden border border-ink-400 bg-ink-950">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute inset-0 size-full object-cover"
      />
      {/* label */}
      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 border border-ink-400 bg-ink-950 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-100">
        <span
          className={cn('inline-block size-1.5', remoteReady ? 'bg-chad-500' : 'bg-mog-500 animate-blink')}
        />
        opponent {partnerHandle ? `· @${partnerHandle}` : ''}
      </div>

      {stage === 'idle' && (
        <button
          onClick={queueAction}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950 transition-colors hover:bg-ink-900"
        >
          <div className="border border-chad-500 bg-ink-900 p-4">
            <Crosshair className="size-6 text-chad-500" />
          </div>
          <div className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-chad-500">
            queue for a match
          </div>
          <div className="max-w-[260px] px-6 text-center font-mono text-[10px] text-ink-300">
            we'll pair you with another mogger looking for action.
          </div>
        </button>
      )}

      {(stage === 'queue' || stage === 'connecting') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950 p-6 text-center">
          <Loader2 className="size-6 animate-spin text-chad-500" />
          <div className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink-100">
            {stage === 'queue' ? 'searching for an opponent…' : 'connecting peer to peer…'}
          </div>
          <div className="max-w-[260px] font-mono text-[10px] text-ink-300">
            {stage === 'queue'
              ? "you're in the queue. the first compatible mogger gets paired automatically."
              : 'negotiating webrtc with your peer. sit tight.'}
          </div>
        </div>
      )}

      {stage === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950 p-6 text-center">
          <div className="border border-blood-500 bg-ink-900 p-3">
            <AlertTriangle className="size-5 text-blood-500" />
          </div>
          <div className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-blood-500">
            match aborted
          </div>
          <div className="font-mono text-[10px] text-ink-300">{errorMsg || 'connection lost.'}</div>
        </div>
      )}
    </div>
  )
}

function ResultModal({
  r,
}: {
  r: {
    winner: 'me' | 'opp' | 'draw'
    mogxDelta: number
    newMogx: number
    prevRank: Rank
    nextRank: Rank
  }
}) {
  const title = r.winner === 'me' ? 'you mogged.' : r.winner === 'opp' ? 'you got mogged.' : 'dead even.'
  const Icon = r.winner === 'me' ? Crown : r.winner === 'opp' ? Skull : PartyPopper
  const accent =
    r.winner === 'me' ? 'var(--color-mog-500)' : r.winner === 'opp' ? 'var(--color-blood-500)' : 'var(--color-chad-500)'
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-ink-950/95" />
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.98, y: 8 }}
        transition={{ duration: 0.18, ease: 'linear' }}
        className="relative w-full max-w-md border-2 border-ink-100 bg-ink-950 p-7 text-center"
        style={{ borderColor: accent }}
      >
        <div
          className="mx-auto mb-4 inline-flex size-12 items-center justify-center border-2"
          style={{ borderColor: accent }}
        >
          <Icon className="size-6" style={{ color: accent }} />
        </div>
        <h2 className="font-mono text-3xl font-extrabold uppercase tracking-tight" style={{ color: accent }}>
          {title}
        </h2>
        <div className="mt-5 flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-[0.14em] text-ink-300">
          <span>
            <span className="text-ink-400">mogx</span>{' '}
            <span className="text-base font-bold text-white">{r.mogxDelta >= 0 ? '+' : ''}{r.mogxDelta}</span>
          </span>
          <span className="text-ink-400">→</span>
          <span>
            <span className="text-base font-bold tabular-nums text-white">
              {r.newMogx.toLocaleString()}
            </span>{' '}
            <span className="text-ink-400">total</span>
          </span>
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          <RankBadge rank={r.prevRank} size="sm" />
          {r.prevRank.key !== r.nextRank.key && (
            <>
              <span className="font-mono text-ink-400">→</span>
              <RankBadge rank={r.nextRank} size="md" />
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
