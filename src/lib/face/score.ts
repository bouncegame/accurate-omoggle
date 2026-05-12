// Transparent attractiveness heuristic on top of MediaPipe FaceLandmarker
// landmarks. The scoring is the explicit weighted sum of six geometric
// sub-scores. It is deterministic - same face, same lighting, same score - and
// every component is visible to the user in the UI breakdown.

import { IDX, type FaceLandmark } from './landmarks'

const PHI = 1.6180339887

function dist(a: FaceLandmark, b: FaceLandmark): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

// Map a target ratio against an actual ratio to a 0..1 quality score.
// 1 when actual === target, smoothly falling off either side.
function ratioScore(actual: number, target: number, tolerance: number): number {
  if (actual <= 0 || target <= 0) return 0
  const rel = Math.abs(actual - target) / target
  // gaussian-ish falloff, tolerance is the rel-distance at which we hit ~0.37
  return Math.exp(-(rel / tolerance) * (rel / tolerance))
}

export type ScoreBreakdown = {
  total: number // 0..10
  symmetry: number // 0..1
  proportions: number // 0..1
  jawline: number // 0..1
  eyeSpacing: number // 0..1
  lipRatio: number // 0..1
  noseRatio: number // 0..1
}

const ZERO: ScoreBreakdown = {
  total: 0,
  symmetry: 0,
  proportions: 0,
  jawline: 0,
  eyeSpacing: 0,
  lipRatio: 0,
  noseRatio: 0,
}

export function scoreFace(landmarks: FaceLandmark[]): ScoreBreakdown {
  if (!landmarks || landmarks.length < 468) return ZERO

  // --- normalize: face width = 1.0 ---
  const left = landmarks[IDX.leftCheek]!
  const right = landmarks[IDX.rightCheek]!
  const top = landmarks[IDX.faceTop]!
  const bottom = landmarks[IDX.chinBottom]!
  const faceWidth = dist(left, right)
  if (faceWidth < 1e-6) return ZERO
  const faceHeight = dist(top, bottom)

  // ---------------------------------------------------------------------
  // 1. SYMMETRY
  // The midline is the line from the nose-bridge anchor (168) to the chin
  // (152). For each (L, R) landmark pair we measure perpendicular distance
  // from that midline and compare. This is pose-tolerant: a slightly tilted
  // head no longer destroys the symmetry score the way a fixed vertical
  // x-midline did.
  // ---------------------------------------------------------------------
  const m0 = landmarks[IDX.noseBridgeTop]!
  const m1 = bottom
  const mx = m1.x - m0.x
  const my = m1.y - m0.y
  const mlen = Math.sqrt(mx * mx + my * my) || 1
  // Perpendicular distance from point p to the m0->m1 line (sign carries side).
  const perpDist = (p: FaceLandmark): number => {
    return ((p.x - m0.x) * my - (p.y - m0.y) * mx) / mlen
  }
  let asymSum = 0
  for (const [li, ri] of IDX.symmetryPairs) {
    const L = landmarks[li]!
    const R = landmarks[ri]!
    const dl = Math.abs(perpDist(L))
    const dr = Math.abs(perpDist(R))
    const denom = Math.max(dl, dr, faceWidth * 0.02)
    asymSum += Math.abs(dl - dr) / denom
  }
  const avgAsym = asymSum / IDX.symmetryPairs.length
  // Forgiving floor: even visibly asymmetric faces don't fall below ~0.35.
  // 0 asym -> 1.0, 30%+ avg asym -> 0.35.
  const symmetry = clamp(1 - avgAsym / 0.46, 0.35, 1)

  // ---------------------------------------------------------------------
  // 2. PROPORTIONS (rule of thirds + face aspect ratio)
  // Vertical thirds and face aspect. Widened tolerances so a face under
  // normal camera framing/head pose isn't punished for not being a canon.
  // ---------------------------------------------------------------------
  const browY = (landmarks[IDX.leftBrowInner]!.y + landmarks[IDX.rightBrowInner]!.y) / 2
  const noseTipY = landmarks[IDX.noseTip]!.y
  const chinY = bottom.y
  const topY = top.y
  const third1 = browY - topY
  const third2 = noseTipY - browY
  const third3 = chinY - noseTipY
  const totalH = third1 + third2 + third3
  const t1 = third1 / totalH
  const t2 = third2 / totalH
  const t3 = third3 / totalH
  const thirdsVar = Math.abs(t1 - 1 / 3) + Math.abs(t2 - 1 / 3) + Math.abs(t3 - 1 / 3)
  const thirdsScore = clamp(1 - thirdsVar / 0.55, 0.3, 1)
  const aspect = faceHeight / faceWidth
  const aspectScore = ratioScore(aspect, 1.45, 0.32)
  const proportions = clamp(0.6 * thirdsScore + 0.4 * aspectScore, 0.3, 1)

  // ---------------------------------------------------------------------
  // 3. JAWLINE definition
  // Chin angle: 70° = razor sharp, 110° = average, 150° = soft. Real faces
  // sit around 95–125° at typical framing, so the gradient is broadened.
  // ---------------------------------------------------------------------
  const chin = bottom
  const jl = landmarks[IDX.jawLeft]!
  const jr = landmarks[IDX.jawRight]!
  const v1x = jl.x - chin.x
  const v1y = jl.y - chin.y
  const v2x = jr.x - chin.x
  const v2y = jr.y - chin.y
  const d1 = Math.sqrt(v1x * v1x + v1y * v1y) || 1
  const d2 = Math.sqrt(v2x * v2x + v2y * v2y) || 1
  const cosA = (v1x * v2x + v1y * v2y) / (d1 * d2)
  const chinAngleDeg = (Math.acos(clamp(cosA, -1, 1)) * 180) / Math.PI
  // 70° -> 1.0, 160° -> 0.3
  const jawline = clamp(1 - (chinAngleDeg - 70) / 130, 0.3, 1)

  // ---------------------------------------------------------------------
  // 4. EYE SPACING
  // Inter-eye distance (inner corners) ~ single eye width is canonical.
  // ---------------------------------------------------------------------
  const inter = dist(landmarks[IDX.leftEyeInner]!, landmarks[IDX.rightEyeInner]!)
  const leftEyeW = dist(landmarks[IDX.leftEyeOuter]!, landmarks[IDX.leftEyeInner]!)
  const rightEyeW = dist(landmarks[IDX.rightEyeOuter]!, landmarks[IDX.rightEyeInner]!)
  const eyeW = (leftEyeW + rightEyeW) / 2
  const eyeRatio = inter / Math.max(eyeW, 1e-6)
  const eyeSpacing = clamp(ratioScore(eyeRatio, 1.0, 0.32), 0.3, 1)

  // ---------------------------------------------------------------------
  // 5. LIP RATIO
  // Lower lip / upper lip thickness target ~φ (1.618). Tolerance generous
  // because lip parting changes the measurement frame-to-frame.
  // ---------------------------------------------------------------------
  const upperLipTop = landmarks[IDX.upperLipTop]!
  const upperLipBottom = landmarks[IDX.upperLipBottom]!
  const lowerLipTop = landmarks[IDX.lowerLipTop]!
  const lowerLipBottom = landmarks[IDX.lowerLipBottom]!
  const upperThick = Math.abs(upperLipBottom.y - upperLipTop.y)
  const lowerThick = Math.abs(lowerLipBottom.y - lowerLipTop.y)
  const lipR = lowerThick / Math.max(upperThick, 1e-6)
  const lipRatio = clamp(ratioScore(lipR, PHI, 0.55), 0.3, 1)

  // ---------------------------------------------------------------------
  // 6. NOSE RATIO
  // Nose width / face width target ~0.235.
  // ---------------------------------------------------------------------
  const noseW = dist(landmarks[IDX.noseLeftAla]!, landmarks[IDX.noseRightAla]!)
  const noseFaceR = noseW / faceWidth
  const noseRatio = clamp(ratioScore(noseFaceR, 0.235, 0.5), 0.3, 1)

  // ---------------------------------------------------------------------
  // weighted combination -> 0..1
  // ---------------------------------------------------------------------
  const weighted =
    0.32 * symmetry +
    0.22 * proportions +
    0.16 * jawline +
    0.12 * eyeSpacing +
    0.10 * lipRatio +
    0.08 * noseRatio

  // Map 0..1 -> 0..10 with a baseline floor and gentle curve. Anchors:
  //   weighted 0.45 -> total ~6.0  (typical face under normal framing)
  //   weighted 0.60 -> total ~7.2  (above-average)
  //   weighted 0.75 -> total ~8.3  (model-tier framing/proportions)
  //   weighted 0.90 -> total ~9.3
  // No real face lands below ~4.5 because each sub-score has a 0.30 floor.
  const total = clamp(2.5 + 7.5 * Math.pow(weighted, 0.9), 0, 10)

  return {
    total,
    symmetry,
    proportions,
    jawline,
    eyeSpacing,
    lipRatio,
    noseRatio,
  }
}

// Exponential moving average smoother for live score readouts.
export class ScoreSmoother {
  private value = 0
  private initialized = false
  private readonly alpha: number
  constructor(alpha: number = 0.18) {
    this.alpha = alpha
  }
  push(x: number): number {
    if (!this.initialized) {
      this.value = x
      this.initialized = true
    } else {
      this.value = this.alpha * x + (1 - this.alpha) * this.value
    }
    return this.value
  }
  get(): number {
    return this.value
  }
  reset(): void {
    this.value = 0
    this.initialized = false
  }
}
