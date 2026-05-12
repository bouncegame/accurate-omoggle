// MediaPipe Face Landmarker - 468 point indices we care about for scoring.
// Reference: https://developers.google.com/mediapipe/solutions/vision/face_landmarker
// These indices are stable across the canonical face mesh topology.

// Center / midline reference points (used to measure asymmetry).
export const IDX = {
  // outer face contour (subset)
  faceTop: 10,           // forehead top
  chinBottom: 152,
  leftCheek: 234,
  rightCheek: 454,

  // Eyes - corners
  leftEyeOuter: 33,
  leftEyeInner: 133,
  rightEyeInner: 362,
  rightEyeOuter: 263,

  // Eye centers (approx)
  leftEyeUp: 159,
  leftEyeDown: 145,
  rightEyeUp: 386,
  rightEyeDown: 374,

  // Eyebrows
  leftBrowOuter: 70,
  leftBrowInner: 107,
  rightBrowInner: 336,
  rightBrowOuter: 300,

  // Nose
  noseTip: 1,
  noseBridgeTop: 168,
  noseLeftAla: 49,
  noseRightAla: 279,
  noseLeftBase: 219,
  noseRightBase: 439,

  // Lips
  lipLeft: 61,
  lipRight: 291,
  upperLipTop: 0,
  upperLipBottom: 13,
  lowerLipTop: 14,
  lowerLipBottom: 17,

  // Jaw / chin
  jawLeft: 172,
  jawRight: 397,
  chinLeft: 176,
  chinRight: 400,

  // Pairs for symmetry comparison (left / right). All measured against a vertical midline.
  symmetryPairs: [
    [33, 263],   // outer eye corners
    [133, 362],  // inner eye corners
    [70, 300],   // brow outer
    [107, 336],  // brow inner
    [49, 279],   // nose ala
    [61, 291],   // mouth corners
    [172, 397],  // jaw
    [234, 454],  // cheekbones
    [127, 356],  // upper cheekbones
    [205, 425],  // mid cheek
    [136, 365],  // lower jaw
  ] as Array<readonly [number, number]>,
} as const

export type FaceLandmark = { x: number; y: number; z: number }
