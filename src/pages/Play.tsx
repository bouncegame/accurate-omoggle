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
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            {stage === 'live' ? 'Live match' : stage === 'result' ? 'Match result' : 'Find a match'}
          </h1>
          <p className="mt-1 text-sm text-ink-300">
            {stage === 'idle' && 'Camera previews locally. Click queue to get paired with a stranger.'}
            {stage === 'queue' && 'Looking for a worthy opponent…'}
            {stage === 'connecting' && 'Establishing peer-to-peer video link…'}
            {stage === 'live' && 'Whoever has the higher score when the clock hits zero takes the MogX.'}
            {stage === 'result' && 'Match complete.'}
            {stage === 'error' && 'Something went wrong.'}
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
            label={profile ? `You · @${profile.handle}` : 'You'}
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
              <div className="text-center font-mono text-3xl font-bold tabular-nums text-white">
                {(timeLeft / 1000).toFixed(1)}s
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-800 ring-1 ring-white/5">
                <motion.div
                  className="h-full"
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / ROUND_MS) * 100}%` }}
                  style={{
                    background:
                      timeLeft < 5000
                        ? 'linear-gradient(90deg, #f43f5e, #ef4444)'
                        : 'linear-gradient(90deg, #6ee7b7, #10b981, #a855f7)',
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
            <Crosshair className="size-4" /> Queue match
          </button>
        )}
        {(stage === 'queue' || stage === 'connecting') && (
          <button onClick={() => void skip()} className="btn-ghost">
            <X className="size-4" /> Cancel
          </button>
        )}
        {stage === 'live' && (
          <button onClick={() => void finishMatch()} className="btn-ghost">
            <SkipForward className="size-4" /> End early
          </button>
        )}
        {(stage === 'result' || stage === 'error') && (
          <>
            <button onClick={() => void skip()} className="btn-primary">
              <Crosshair className="size-4" /> Next match
            </button>
            <Link to="/app" className="btn-ghost">
              Back to dashboard
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
  const color = side === 'me' ? '#10b981' : '#a855f7'
  return (
    <div className="mt-3 flex items-center gap-3">
      <span className="w-12 text-xs uppercase tracking-[0.18em] text-ink-400">
        {side === 'me' ? 'You' : 'Opp.'}
      </span>
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-ink-800 ring-1 ring-white/5">
        <motion.div
          className="absolute inset-y-0 left-0"
          initial={{ width: 0 }}
          animate={{ width: `${(score / 10) * 100}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 14 }}
          style={{ background: color, boxShadow: `0 0 14px -4px ${color}` }}
        />
      </div>
      <span
        className={cn(
          'w-14 text-right font-mono text-sm font-semibold tabular-nums',
          muted ? 'text-ink-500' : '',
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
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-ink-900 ring-1 ring-white/5">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute inset-0 size-full object-cover"
      />
      {/* label */}
      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-ink-100 ring-1 ring-white/10 backdrop-blur-sm">
        <span
          className={cn('size-1.5 rounded-full', remoteReady ? 'bg-chad-400' : 'bg-amber-400')}
        />
        Opponent {partnerHandle ? `· @${partnerHandle}` : ''}
      </div>

      {stage === 'idle' && (
        <button
          onClick={queueAction}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/70 transition-colors hover:bg-ink-950/60"
        >
          <div className="rounded-full bg-chad-500/10 p-4 ring-1 ring-chad-500/30">
            <Crosshair className="size-7 text-chad-400" />
          </div>
          <div className="text-sm font-semibold text-ink-100">Queue for a match</div>
          <div className="px-6 text-center text-xs text-ink-300">
            We'll pair you with another mogger looking for action.
          </div>
        </button>
      )}

      {(stage === 'queue' || stage === 'connecting') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/80 p-6 text-center">
          <Loader2 className="size-7 animate-spin text-chad-400" />
          <div className="text-sm font-semibold text-ink-100">
            {stage === 'queue' ? 'Searching for an opponent…' : 'Connecting peer to peer…'}
          </div>
          <div className="max-w-[260px] text-xs text-ink-300">
            {stage === 'queue'
              ? 'You\'re in the queue. The first compatible mogger gets paired automatically.'
              : 'Negotiating WebRTC with your peer. Sit tight.'}
          </div>
        </div>
      )}

      {stage === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/90 p-6 text-center">
          <div className="rounded-full bg-blood-500/15 p-3 ring-1 ring-blood-500/40">
            <AlertTriangle className="size-6 text-blood-500" />
          </div>
          <div className="text-sm font-medium text-ink-100">Match aborted</div>
          <div className="text-xs text-ink-300">{errorMsg || 'Connection lost.'}</div>
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
  const title = r.winner === 'me' ? 'You mogged.' : r.winner === 'opp' ? 'You got mogged.' : 'Dead even.'
  const Icon = r.winner === 'me' ? Crown : r.winner === 'opp' ? Skull : PartyPopper
  const accent =
    r.winner === 'me' ? '#a855f7' : r.winner === 'opp' ? '#f43f5e' : '#f59e0b'
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-ink-950/85 backdrop-blur-xl" />
      <motion.div
        initial={{ scale: 0.85, y: 18 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 12 }}
        transition={{ type: 'spring', stiffness: 240, damping: 20 }}
        className="glass-strong relative w-full max-w-md overflow-hidden rounded-2xl p-7 text-center"
        style={{ boxShadow: `0 30px 80px -20px ${accent}55` }}
      >
        <div
          className="mx-auto mb-3 inline-flex size-14 items-center justify-center rounded-full"
          style={{ background: `${accent}20`, boxShadow: `0 0 30px -6px ${accent}` }}
        >
          <Icon className="size-7" style={{ color: accent }} />
        </div>
        <h2 className="font-display text-3xl font-bold" style={{ color: accent }}>
          {title}
        </h2>
        <div className="mt-4 flex items-center justify-center gap-3 text-sm text-ink-200">
          <span>
            <span className="text-ink-400">MogX</span>{' '}
            <span className="font-mono text-base font-semibold text-white">+{r.mogxDelta}</span>
          </span>
          <span className="text-ink-500">→</span>
          <span>
            <span className="font-mono text-base font-semibold text-white">
              {r.newMogx.toLocaleString()}
            </span>{' '}
            <span className="text-ink-400">total</span>
          </span>
        </div>
        <div className="mt-5 flex items-center justify-center gap-3">
          <RankBadge rank={r.prevRank} size="sm" />
          {r.prevRank.key !== r.nextRank.key && (
            <>
              <span className="text-ink-500">→</span>
              <RankBadge rank={r.nextRank} size="md" />
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
