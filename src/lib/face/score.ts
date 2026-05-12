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

export function scoreFace(landmarks: FaceLandmark[]): ScoreBreakdown {
  if (!landmarks || landmarks.length < 468) {
    return {
      total: 0,
      symmetry: 0,
      proportions: 0,
      jawline: 0,
      eyeSpacing: 0,
      lipRatio: 0,
      noseRatio: 0,
    }
  }

  // --- normalize: face width = 1.0 ---
  const left = landmarks[IDX.leftCheek]!
  const right = landmarks[IDX.rightCheek]!
  const top = landmarks[IDX.faceTop]!
  const bottom = landmarks[IDX.chinBottom]!
  const faceWidth = dist(left, right)
  if (faceWidth < 1e-6) {
    return {
      total: 0,
      symmetry: 0,
      proportions: 0,
      jawline: 0,
      eyeSpacing: 0,
      lipRatio: 0,
      noseRatio: 0,
    }
  }
  const faceHeight = dist(top, bottom)

  // ---------------------------------------------------------------------
  // 1. SYMMETRY
  // Midline x = midpoint of nose bridge top + chin bottom.
  // For each (L, R) pair, distance from midline should match.
  // ---------------------------------------------------------------------
  const noseBridge = landmarks[IDX.noseBridgeTop]!
  const midX = (noseBridge.x + bottom.x) / 2
  let asymSum = 0
  for (const [li, ri] of IDX.symmetryPairs) {
    const L = landmarks[li]!
    const R = landmarks[ri]!
    const dl = Math.abs(L.x - midX)
    const dr = Math.abs(R.x - midX)
    const denom = Math.max(dl, dr, 1e-6)
    asymSum += Math.abs(dl - dr) / denom // 0 when perfectly symmetric
  }
  const avgAsym = asymSum / IDX.symmetryPairs.length
  // 0% asym -> 1.0, 15% asym -> 0
  const symmetry = clamp(1 - avgAsym / 0.15, 0, 1)

  // ---------------------------------------------------------------------
  // 2. PROPORTIONS (rule of thirds + face aspect ratio)
  // Face height / width target ~ 1.5
  // brow line y vs nose tip y vs chin: thirds (each ~1/3)
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
  // ideal = 1/3 each; penalize variance
  const thirdsVar = Math.abs(t1 - 1 / 3) + Math.abs(t2 - 1 / 3) + Math.abs(t3 - 1 / 3)
  const thirdsScore = clamp(1 - thirdsVar / 0.35, 0, 1)
  // face aspect (height / width). target ~1.5 for "balanced".
  const aspect = faceHeight / faceWidth
  const aspectScore = ratioScore(aspect, 1.45, 0.18)
  const proportions = 0.6 * thirdsScore + 0.4 * aspectScore

  // ---------------------------------------------------------------------
  // 3. JAWLINE definition
  // Take the angle at the chin: vectors chin->jawLeft and chin->jawRight.
  // Narrower chin angle = sharper jaw = higher score.
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
  // chinAngle: 70-90 deg = sharp/defined (1.0), 130+ = weak chin (0.2)
  const jawline = clamp(1 - (chinAngleDeg - 75) / 70, 0.15, 1)

  // ---------------------------------------------------------------------
  // 4. EYE SPACING
  // Inter-eye distance (inner corners) should ~= eye width.
  // Eye width = avg(outer-inner distance of each eye)
  // ---------------------------------------------------------------------
  const inter = dist(landmarks[IDX.leftEyeInner]!, landmarks[IDX.rightEyeInner]!)
  const leftEyeW = dist(landmarks[IDX.leftEyeOuter]!, landmarks[IDX.leftEyeInner]!)
  const rightEyeW = dist(landmarks[IDX.rightEyeOuter]!, landmarks[IDX.rightEyeInner]!)
  const eyeW = (leftEyeW + rightEyeW) / 2
  const eyeRatio = inter / Math.max(eyeW, 1e-6)
  const eyeSpacing = ratioScore(eyeRatio, 1.0, 0.18)

  // ---------------------------------------------------------------------
  // 5. LIP RATIO
  // Lower lip thickness / upper lip thickness should be ~1.618 (golden).
  // We measure vertical thickness of each lip.
  // ---------------------------------------------------------------------
  const upperLipTop = landmarks[IDX.upperLipTop]!
  const upperLipBottom = landmarks[IDX.upperLipBottom]!
  const lowerLipTop = landmarks[IDX.lowerLipTop]!
  const lowerLipBottom = landmarks[IDX.lowerLipBottom]!
  const upperThick = Math.abs(upperLipBottom.y - upperLipTop.y)
  const lowerThick = Math.abs(lowerLipBottom.y - lowerLipTop.y)
  const lipR = lowerThick / Math.max(upperThick, 1e-6)
  const lipRatio = ratioScore(lipR, PHI, 0.4)

  // ---------------------------------------------------------------------
  // 6. NOSE RATIO
  // Nose width should be roughly inter-pupillary / golden (~1/PHI).
  // i.e. noseWidth / faceWidth target ~0.22-0.25
  // ---------------------------------------------------------------------
  const noseW = dist(landmarks[IDX.noseLeftAla]!, landmarks[IDX.noseRightAla]!)
  const noseFaceR = noseW / faceWidth
  const noseRatio = ratioScore(noseFaceR, 0.235, 0.35)

  // ---------------------------------------------------------------------
  // weighted combination
  // ---------------------------------------------------------------------
  const weighted =
    0.32 * symmetry +
    0.22 * proportions +
    0.16 * jawline +
    0.12 * eyeSpacing +
    0.10 * lipRatio +
    0.08 * noseRatio

  // Map 0..1 -> 0..10 with a slight S-curve so middling faces don't all stack
  // around 5.0. We anchor: 0.4 -> ~4, 0.6 -> ~6.5, 0.8 -> ~8.5.
  const curved = 10 * Math.pow(weighted, 1.15)
  const total = clamp(curved, 0, 10)

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
