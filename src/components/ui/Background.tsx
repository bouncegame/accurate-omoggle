import { motion } from 'framer-motion'

// Ambient page background: dark gradient + animated grid + drifting orbs.
export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 600px at 80% -10%, rgba(168,85,247,0.20), transparent 60%),' +
            'radial-gradient(900px 500px at -10% 110%, rgba(16,185,129,0.18), transparent 60%),' +
            'radial-gradient(700px 700px at 50% 50%, rgba(255,255,255,0.02), transparent 70%),' +
            'linear-gradient(180deg, #050608 0%, #07080d 60%, #050608 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),' +
            'linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage:
            'radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 80%)',
        }}
      />
      <motion.div
        className="absolute -top-32 left-1/3 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(16,185,129,0.25), transparent)' }}
        animate={{ x: [0, 60, -40, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 right-1/4 h-[600px] w-[600px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(168,85,247,0.20), transparent)' }}
        animate={{ x: [0, -70, 50, 0], y: [0, -40, 30, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.9' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  )
}
