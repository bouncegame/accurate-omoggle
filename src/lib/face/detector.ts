// Wraps MediaPipe FaceLandmarker so it can be loaded once and reused.

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'

// Served from our own origin via the `copy-mediapipe-wasm` Vite plugin
// (see vite.config.ts) so the WASM version always matches the installed
// @mediapipe/tasks-vision npm package and there is no CDN dependency.
const WASM_URL = '/mediapipe'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

let cached: Promise<FaceLandmarker> | null = null

export function loadFaceLandmarker(): Promise<FaceLandmarker> {
  if (cached) return cached
  cached = (async () => {
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
    return FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    })
  })()
  cached.catch(() => {
    cached = null
  })
  return cached
}

export type DetectionResult = FaceLandmarkerResult
