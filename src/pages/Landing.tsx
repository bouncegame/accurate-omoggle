import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Crown,
  Eye,
  Lock,
  Radar,
  Scale,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { RANKS } from '@/lib/ranks'
import { RankBadge } from '@/components/ui/RankBadge'
import { cn } from '@/lib/cn'

const features = [
  {
    icon: Radar,
    title: '468-point face mesh',
    body: 'MediaPipe FaceLandmarker runs locally in your browser. No image ever leaves your device.',
  },
  {
    icon: Scale,
    title: 'Transparent scoring',
    body: 'Six explicit sub-scores: symmetry, proportions, jawline, eye spacing, lip ratio, nose ratio. Weighted, never random.',
  },
  {
    icon: Zap,
    title: 'Real-time 1v1',
    body: 'Peer-to-peer WebRTC matches against random opponents — Omegle, but for mogging.',
  },
  {
    icon: Trophy,
    title: 'Eight rank ladder',
    body: 'Climb from Chud to Chad. Bigger mogs award more MogX. Losing still earns a little.',
  },
  {
    icon: Lock,
    title: 'No tracking',
    body: "We don't store your face. Profiles are public, scores are session-local.",
  },
  {
    icon: Eye,
    title: 'Live mesh overlay',
    body: 'See the wireframe and every landmark in real time as the score updates.',
  },
] as const

export function Landing() {
  return (
    <div className="relative min-h-dvh">
      <Header />
      <Hero />
      <RankLadderSection />
      <FeatureSection />
      <HowItWorks />
      <FairnessNote />
      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5">
      <Logo />
      <nav className="hidden items-center gap-7 text-sm text-ink-200 md:flex">
        <a href="#ranks" className="hover:text-white transition-colors">Ranks</a>
        <a href="#features" className="hover:text-white transition-colors">Features</a>
        <a href="#how" className="hover:text-white transition-colors">How it works</a>
        <a href="#fair" className="hover:text-white transition-colors">Fairness</a>
      </nav>
      <div className="flex items-center gap-2">
        <Link to="/auth" className="btn-ghost hidden text-sm md:inline-flex">
          Sign in
        </Link>
        <Link to="/auth?mode=signup" className="btn-primary text-sm">
          <Sparkles className="size-4" /> Start mogging
        </Link>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative mx-auto w-full max-w-7xl px-5 pb-20 pt-10 md:pt-16">
      <div className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <motion.div
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-mog-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-mog-200 ring-1 ring-mog-500/30"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="size-1.5 animate-pulse rounded-full bg-mog-300" />
            Realistic. Geometric. Brutally honest.
          </motion.div>
          <h1 className="font-display text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            The mogging
            <br />
            game that{' '}
            <span className="text-gradient">actually scores</span>
            <br />
            your face.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-base text-ink-200 md:text-lg">
            Omoggle ranks every face 9.0 the moment you tilt your head. AccurateOmoggle uses a
            468-point face mesh and a transparent geometric heuristic, so the score
            actually responds to your symmetry, proportions, and jawline.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/auth?mode=signup" className="btn-primary group">
              Get my real score
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#how" className="btn-ghost">
              How it works
            </a>
          </div>

          <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
            <Stat label="Landmarks" value="468" />
            <Stat label="Sub-scores" value="6" />
            <Stat label="Ranks" value="8" />
          </div>
        </motion.div>

        <HeroVisual />
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl px-4 py-3">
      <div className="font-display text-2xl font-semibold tabular-nums text-white">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-ink-300">{label}</div>
    </div>
  )
}

function HeroVisual() {
  return (
    <motion.div
      className="relative mx-auto aspect-square w-full max-w-[460px]"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.15 }}
    >
      <div
        className="absolute inset-0 rounded-[2rem] glass-strong"
        style={{
          boxShadow:
            '0 50px 80px -30px rgba(16,185,129,0.35), 0 0 60px -20px rgba(168,85,247,0.35)',
        }}
      />
      {/* score readout */}
      <div className="absolute left-5 top-5 z-10 rounded-xl bg-black/45 px-3 py-2 ring-1 ring-white/10 backdrop-blur-md">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-300">Live Score</div>
        <div className="font-display text-3xl font-bold leading-none tabular-nums text-mog-300">
          7.84
        </div>
      </div>
      <div className="absolute right-5 top-5 z-10 rounded-xl bg-black/45 px-3 py-2 text-right ring-1 ring-white/10 backdrop-blur-md">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-300">Status</div>
        <div className="text-xs font-semibold text-mog-300">Locked</div>
      </div>

      {/* face mesh SVG */}
      <FaceMeshArt />

      <motion.div
        className="absolute inset-x-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(110,231,183,0.9) 50%, transparent 100%)',
          boxShadow: '0 0 16px 2px rgba(110,231,183,0.7)',
        }}
        initial={{ y: 24 }}
        animate={{ y: 'calc(100% - 24px)' }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
      />

      {/* corner brackets */}
      <span className="absolute left-3 top-3 size-7 rounded-tl-md border-l-2 border-t-2 border-mog-300/80" />
      <span className="absolute right-3 top-3 size-7 rounded-tr-md border-r-2 border-t-2 border-mog-300/80" />
      <span className="absolute bottom-3 left-3 size-7 rounded-bl-md border-b-2 border-l-2 border-mog-300/80" />
      <span className="absolute bottom-3 right-3 size-7 rounded-br-md border-b-2 border-r-2 border-mog-300/80" />

      {/* sub-score chips */}
      <div className="absolute bottom-5 left-5 right-5 grid grid-cols-3 gap-2">
        {[
          { l: 'Symmetry', v: '0.83' },
          { l: 'Proportions', v: '0.74' },
          { l: 'Jawline', v: '0.91' },
        ].map((s) => (
          <div key={s.l} className="rounded-lg bg-black/55 px-2.5 py-1.5 ring-1 ring-white/10 backdrop-blur-md">
            <div className="text-[9px] uppercase tracking-[0.18em] text-ink-300">{s.l}</div>
            <div className="font-mono text-sm tabular-nums text-mog-200">{s.v}</div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function FaceMeshArt() {
  // Stylized face mesh wireframe (decorative).
  return (
    <svg
      viewBox="0 0 400 400"
      className="absolute inset-0 size-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="mesh-gradient" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="rgba(110,231,183,0.0)" />
          <stop offset="40%" stopColor="rgba(110,231,183,0.0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
        </radialGradient>
        <linearGradient id="mesh-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#mesh-gradient)" />
      <g
        stroke="url(#mesh-stroke)"
        strokeWidth="0.8"
        fill="none"
        opacity="0.85"
        strokeLinecap="round"
      >
        {/* face oval */}
        <path d="M120 175 C 120 110, 280 110, 280 175 C 280 260, 240 320, 200 330 C 160 320, 120 260, 120 175 Z" />
        {/* eye lines */}
        <path d="M150 175 Q 170 165 190 175 Q 170 185 150 175 Z" />
        <path d="M210 175 Q 230 165 250 175 Q 230 185 210 175 Z" />
        {/* nose */}
        <path d="M200 180 L 195 230 L 200 240 L 205 230 Z" />
        {/* mouth */}
        <path d="M170 270 Q 200 290 230 270 Q 200 280 170 270 Z" />
        {/* horizontal grid */}
        <path d="M125 200 Q 200 215 275 200" />
        <path d="M125 220 Q 200 235 275 220" />
        <path d="M130 250 Q 200 270 270 250" />
        {/* vertical grid */}
        <path d="M165 130 Q 170 200 175 290" />
        <path d="M200 120 Q 200 200 200 310" />
        <path d="M235 130 Q 230 200 225 290" />
        {/* triangulation */}
        <path d="M150 175 L 200 230 L 250 175" />
        <path d="M150 175 L 175 240" />
        <path d="M250 175 L 225 240" />
        <path d="M150 175 L 130 220" />
        <path d="M250 175 L 270 220" />
        <path d="M175 240 L 200 280" />
        <path d="M225 240 L 200 280" />
        <path d="M200 230 L 170 270" />
        <path d="M200 230 L 230 270" />
      </g>
      {/* landmark dots */}
      <g fill="#6ee7b7">
        {[
          [150, 175], [170, 170], [190, 175], [170, 180],
          [210, 175], [230, 170], [250, 175], [230, 180],
          [195, 195], [200, 215], [205, 195],
          [195, 230], [200, 240], [205, 230],
          [170, 270], [200, 282], [230, 270], [200, 275],
          [165, 130], [200, 122], [235, 130],
          [125, 200], [275, 200], [200, 330],
          [130, 220], [270, 220], [175, 240], [225, 240],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={1.6} />
        ))}
      </g>
    </svg>
  )
}

function RankLadderSection() {
  return (
    <section id="ranks" className="relative mx-auto w-full max-w-7xl px-5 py-20">
      <SectionHeader
        eyebrow="The ladder"
        title={<>From <span className="text-gradient">Chud</span> to <span className="text-gradient-chad">Chad</span>.</>}
        body="Win matches, earn MogX. Mogging by a larger margin pays out more. Eight tiers, transparent thresholds."
      />
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {RANKS.map((r, i) => (
          <motion.div
            key={r.key}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: i * 0.04 }}
            className={cn(
              'glass relative overflow-hidden rounded-2xl p-4',
              i === RANKS.length - 1 && 'ring-1 ring-chad-500/40',
            )}
            style={{
              boxShadow: i === RANKS.length - 1 ? `0 0 30px -8px ${r.glow}` : undefined,
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${r.gradient[1]}, transparent)` }}
            />
            <div className="flex items-center justify-between">
              <RankBadge rank={r} size="sm" />
              {i === RANKS.length - 1 && <Crown className="size-4 text-chad-400" />}
            </div>
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400">Threshold</div>
              <div className="font-display text-xl font-semibold tabular-nums text-white">
                {r.threshold.toLocaleString()}
                <span className="ml-1 text-xs font-normal text-ink-400">MogX</span>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-300">{r.tagline}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function FeatureSection() {
  return (
    <section id="features" className="relative mx-auto w-full max-w-7xl px-5 py-20">
      <SectionHeader
        eyebrow="The build"
        title={<>Built different. <span className="text-gradient">On purpose.</span></>}
        body="Omoggle's score wobbles randomly between 8.5 and 9.5 no matter who you are. Ours actually does something."
      />
      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="glass relative overflow-hidden rounded-2xl p-5"
          >
            <div className="mb-3 inline-flex items-center justify-center rounded-xl bg-mog-500/10 p-2.5 ring-1 ring-mog-500/30">
              <f.icon className="size-5 text-mog-300" />
            </div>
            <div className="text-base font-semibold text-white">{f.title}</div>
            <div className="mt-1 text-sm text-ink-300">{f.body}</div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '01', t: 'Sign up', b: 'Email + password. Pick a handle. We auto-generate one if you skip.' },
    { n: '02', t: 'Calibrate', b: 'Frame your face. We dial in the 468-point mesh and show every sub-score in real time.' },
    { n: '03', t: 'Queue up', b: 'One click drops you in the matchmaking queue. WebRTC pairs you with a stranger.' },
    { n: '04', t: 'Mog or get mogged', b: '20-second face-off. Both scores update live. Bigger mog = bigger MogX payout.' },
  ]
  return (
    <section id="how" className="relative mx-auto w-full max-w-7xl px-5 py-20">
      <SectionHeader
        eyebrow="The flow"
        title={<>From signup to <span className="text-gradient-chad">Chad</span> in four steps.</>}
      />
      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="glass relative rounded-2xl p-5"
          >
            <div className="font-mono text-xs text-mog-300">{s.n}</div>
            <div className="mt-2 text-lg font-semibold text-white">{s.t}</div>
            <div className="mt-1 text-sm text-ink-300">{s.b}</div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function FairnessNote() {
  return (
    <section id="fair" className="relative mx-auto w-full max-w-3xl px-5 py-20">
      <div className="glass-strong rounded-2xl p-8 md:p-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-chad-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-chad-400 ring-1 ring-chad-500/30">
          <Scale className="size-3.5" /> Honesty note
        </div>
        <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">
          No algorithm can "truly" rate attractiveness.
        </h2>
        <p className="mt-4 text-pretty text-ink-200">
          Beauty is subjective. What AccurateOmoggle (and every site that claims AI attractiveness)
          actually measures is <span className="text-white">geometry</span>: how symmetric your
          features are, how close your facial thirds and ratios sit to canonical targets, how
          sharply your jaw angles. We expose every sub-score so you can see exactly why your number
          is what it is. It's a game — play it like one.
        </p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="relative z-10 mx-auto w-full max-w-7xl border-t border-white/5 px-5 py-10">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="text-xs text-ink-400">© AccurateOmoggle. All faces respected.</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-ink-300">
          <a href="https://github.com/bouncegame/accurate-omoggle" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-white">
            <Swords className="size-4" /> Source
          </a>
          <Link to="/auth" className="hover:text-white">Sign in</Link>
          <Link to="/auth?mode=signup" className="hover:text-white">Sign up</Link>
        </div>
      </div>
    </footer>
  )
}

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: React.ReactNode
  body?: string
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-ink-200 ring-1 ring-white/10">
        {eyebrow}
      </div>
      <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-5xl">
        {title}
      </h2>
      {body && <p className="mt-4 text-pretty text-ink-300">{body}</p>}
    </div>
  )
}
