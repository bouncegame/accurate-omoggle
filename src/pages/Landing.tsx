import { Link } from 'react-router-dom'
import { ArrowRight, Crown } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { RANKS } from '@/lib/ranks'
import { RankBadge } from '@/components/ui/RankBadge'
import { cn } from '@/lib/cn'

// AccurateOmoggle marketing site, brutalist build.
// Black background, hard grid, mono everything, one accent (acid green), one
// secondary (magenta) for highlight moments. No gradients, no glow, no glass,
// no orbs, no decorative SVG mesh. Reads like a scoreboard / spec sheet.

const features = [
  ['468pt', 'face mesh', 'MediaPipe FaceLandmarker runs locally in your browser. No image leaves your device.'],
  ['6', 'sub-scores', 'Symmetry, proportions, jawline, eye spacing, lip ratio, nose ratio. Weighted, never random.'],
  ['1v1', 'WebRTC', 'Peer-to-peer matches against random opponents. Omegle for mogging.'],
  ['8', 'rank tiers', 'Chud through Chad. Bigger mogs award more MogX. Losing still earns a little.'],
  ['0', 'tracking', "We don't store your face. Profiles are public, scores are session-local."],
  ['live', 'mesh', 'See the wireframe and every landmark in real time as the score updates.'],
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
    <header className="sticky top-0 z-30 border-b border-ink-500 bg-ink-950">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4">
        <Logo />
        <nav className="hidden items-center gap-7 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-ink-300 md:flex">
          <a href="#ranks" className="hover:text-mog-500 transition-colors">ranks</a>
          <a href="#features" className="hover:text-mog-500 transition-colors">features</a>
          <a href="#how" className="hover:text-mog-500 transition-colors">how</a>
          <a href="#fair" className="hover:text-mog-500 transition-colors">fairness</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="btn-ghost hidden md:inline-flex">
            sign in
          </Link>
          <Link to="/auth?mode=signup" className="btn-primary">
            start mogging
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative mx-auto w-full max-w-7xl px-5 pb-24 pt-16 md:pt-24">
      <div className="grid items-start gap-12 md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 border border-ink-500 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-200">
            <span className="inline-block size-1.5 animate-blink bg-mog-500" />
            v0.1 / build is live
          </div>
          <h1 className="font-mono text-5xl font-extrabold uppercase leading-[0.92] tracking-tight md:text-7xl">
            the mogging<br />
            game that<br />
            <span className="text-mog-500">actually scores</span><br />
            your face.
          </h1>
          <p className="mt-8 max-w-xl font-mono text-sm leading-relaxed text-ink-200 md:text-base">
            Other sites slap a 9.0 on every face the second you tilt your head. AccurateOmoggle
            runs a 468-point face mesh and a transparent geometric heuristic — the score
            actually responds to your symmetry, proportions and jawline.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/auth?mode=signup" className="btn-primary group">
              get my real score
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#how" className="btn-ghost">how it works</a>
          </div>
          <div className="mt-12 grid max-w-md grid-cols-3 divide-x divide-ink-500 border border-ink-500">
            <Stat label="landmarks" value="468" />
            <Stat label="sub-scores" value="6" />
            <Stat label="rank tiers" value="8" />
          </div>
        </div>

        <HeroPanel />
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <div className="font-mono text-3xl font-extrabold tabular-nums text-white">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">{label}</div>
    </div>
  )
}

function HeroPanel() {
  // Static, illustrative scoreboard panel — communicates the readout aesthetic
  // without animated chrome.
  return (
    <div className="border border-ink-400 bg-ink-900">
      <div className="flex items-center justify-between border-b border-ink-500 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-300">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 animate-blink bg-mog-500" />
          live readout
        </span>
        <span>locked</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-ink-500 border-b border-ink-500">
        <div className="p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">score</div>
          <div className="mt-1 font-mono text-6xl font-extrabold leading-none tabular-nums text-mog-500">
            7.84
          </div>
        </div>
        <div className="p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">rank</div>
          <div className="mt-2"><RankBadge rank={RANKS[5]!} size="md" /></div>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300">mogx</div>
          <div className="font-mono text-lg font-bold tabular-nums text-white">2,684</div>
        </div>
      </div>
      <div className="divide-y divide-ink-500">
        {[
          ['symmetry', 0.83, '0.32'],
          ['proportions', 0.74, '0.22'],
          ['jawline', 0.91, '0.16'],
          ['eye spacing', 0.71, '0.12'],
          ['lip ratio', 0.66, '0.10'],
          ['nose ratio', 0.79, '0.08'],
        ].map(([label, v, w]) => {
          const pct = Math.round((v as number) * 100)
          return (
            <div key={label as string} className="flex items-center gap-4 px-4 py-2.5">
              <span className="w-24 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-200">
                {label as string}
              </span>
              <div className="relative h-2 flex-1 border border-ink-500 bg-ink-950">
                <div
                  className="absolute inset-y-0 left-0 bg-mog-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-12 text-right font-mono text-sm tabular-nums text-white">
                {(v as number).toFixed(2)}
              </span>
              <span className="w-8 text-right font-mono text-[10px] tabular-nums text-ink-400">
                {w as string}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RankLadderSection() {
  return (
    <section id="ranks" className="relative mx-auto w-full max-w-7xl px-5 py-24 border-t border-ink-500">
      <SectionHeader
        eyebrow="rank ladder"
        title={<>from <span className="text-mog-500">Chud</span> to <span className="text-chad-500">Chad</span></>}
        body="Win matches, earn MogX. Mogging by a larger margin pays out more. Eight tiers, transparent thresholds."
      />
      <div className="mt-12 grid grid-cols-1 divide-y divide-ink-500 border border-ink-500 md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="grid grid-cols-2 divide-x divide-y divide-ink-500 [&>*:nth-child(-n+2)]:border-t-0">
          {RANKS.slice(0, 4).map((r) => (
            <RankCell key={r.key} rank={r} />
          ))}
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-ink-500 [&>*:nth-child(-n+2)]:border-t-0">
          {RANKS.slice(4).map((r, i) => (
            <RankCell key={r.key} rank={r} crowned={i === 3} />
          ))}
        </div>
      </div>
    </section>
  )
}

function RankCell({ rank, crowned }: { rank: (typeof RANKS)[number]; crowned?: boolean }) {
  return (
    <div className="relative flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <RankBadge rank={rank} size="sm" />
        {crowned && <Crown className="size-3.5 text-mog-500" />}
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">threshold</div>
        <div className="font-mono text-xl font-bold tabular-nums text-white">
          {rank.threshold.toLocaleString()}
          <span className="ml-1.5 text-[10px] font-normal text-ink-400">MOGX</span>
        </div>
      </div>
      <p className="font-mono text-[11px] leading-relaxed text-ink-300">{rank.tagline}</p>
    </div>
  )
}

function FeatureSection() {
  return (
    <section id="features" className="relative mx-auto w-full max-w-7xl px-5 py-24 border-t border-ink-500">
      <SectionHeader
        eyebrow="build sheet"
        title={<>built different. <span className="text-mog-500">on purpose.</span></>}
        body="Omoggle's score wobbles randomly between 8.5 and 9.5 no matter who you are. Ours actually does something."
      />
      <div className="mt-12 grid grid-cols-1 divide-y divide-ink-500 border border-ink-500 md:grid-cols-3 md:divide-x md:divide-y-0">
        {features.map(([metric, label, body], i) => (
          <div key={i} className={cn(
            'flex flex-col gap-3 p-6',
            i >= 3 && 'md:border-t md:border-ink-500',
          )}>
            <div>
              <div className="font-mono text-3xl font-extrabold uppercase leading-none tracking-tight text-mog-500">
                {metric}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">
                {label}
              </div>
            </div>
            <p className="font-mono text-[12px] leading-relaxed text-ink-200">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    ['01', 'sign up', 'Email + password. Pick a handle. We auto-generate one if you skip.'],
    ['02', 'calibrate', 'Frame your face. The 468-point mesh locks in and every sub-score updates live.'],
    ['03', 'queue up', 'One click drops you into matchmaking. WebRTC pairs you with a stranger.'],
    ['04', 'mog or get mogged', '20-second face-off. Both scores update live. Bigger mog = bigger MogX payout.'],
  ] as const
  return (
    <section id="how" className="relative mx-auto w-full max-w-7xl px-5 py-24 border-t border-ink-500">
      <SectionHeader
        eyebrow="flow"
        title={<>signup → <span className="text-mog-500">Chad</span> in four steps</>}
      />
      <div className="mt-12 grid grid-cols-1 divide-y divide-ink-500 border border-ink-500 md:grid-cols-4 md:divide-x md:divide-y-0">
        {steps.map(([n, t, b]) => (
          <div key={n} className="flex flex-col gap-3 p-6">
            <div className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-mog-500">
              {n}
            </div>
            <div className="font-mono text-base font-bold uppercase tracking-tight text-white">{t}</div>
            <div className="font-mono text-[12px] leading-relaxed text-ink-200">{b}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function FairnessNote() {
  return (
    <section id="fair" className="relative mx-auto w-full max-w-4xl px-5 py-24 border-t border-ink-500">
      <div className="border border-ink-400 bg-ink-900 p-8 md:p-10">
        <div className="mb-4 inline-flex items-center gap-2 border border-chad-500 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-chad-500">
          honesty note
        </div>
        <h2 className="font-mono text-3xl font-extrabold uppercase leading-tight tracking-tight md:text-4xl">
          no algorithm can "truly" rate attractiveness.
        </h2>
        <p className="mt-5 font-mono text-sm leading-relaxed text-ink-200">
          Beauty is subjective. What AccurateOmoggle (and every site that claims AI attractiveness)
          actually measures is <span className="text-white">geometry</span>: how symmetric your
          features are, how close your facial thirds and ratios sit to canonical targets, how
          sharply your jaw angles. We expose every sub-score so you can see exactly why your
          number is what it is. It's a game — play it like one.
        </p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-ink-500">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 px-5 py-8 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">
            © accurate/omoggle — all faces respected
          </span>
        </div>
        <div className="flex items-center gap-5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-300">
          <a href="https://github.com/bouncegame/accurate-omoggle" target="_blank" rel="noreferrer" className="hover:text-mog-500">source</a>
          <Link to="/auth" className="hover:text-mog-500">sign in</Link>
          <Link to="/auth?mode=signup" className="hover:text-mog-500">sign up</Link>
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
    <div className="max-w-2xl">
      <div className="mb-4 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-ink-300">
        <span className="inline-block h-px w-6 bg-ink-300" />
        {eyebrow}
      </div>
      <h2 className="font-mono text-3xl font-extrabold uppercase leading-[1.05] tracking-tight md:text-5xl">
        {title}
      </h2>
      {body && <p className="mt-5 font-mono text-sm leading-relaxed text-ink-200 md:text-base">{body}</p>}
    </div>
  )
}
