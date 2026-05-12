// Wraps MediaPipe FaceLandmarker so it can be loaded once and reused.

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
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
