// Minimal WebRTC peer connection helpers + Supabase Realtime signaling.

import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
]

export type SignalMessage =
  | { type: 'offer'; sdp: string; from: string }
  | { type: 'answer'; sdp: string; from: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit; from: string }
  | { type: 'score'; value: number; from: string }
  | { type: 'ready'; from: string }
  | { type: 'bye'; from: string }

export type PeerHandlers = {
  onRemoteStream: (stream: MediaStream) => void
  onConnected: () => void
  onDisconnected: () => void
  onRemoteScore?: (score: number) => void
  onPeerReady?: () => void
  onPeerBye?: () => void
}

export class PeerSession {
  private pc: RTCPeerConnection
  private channel: RealtimeChannel | null = null
  private localStream: MediaStream | null = null
  private destroyed = false
  private pendingCandidates: RTCIceCandidateInit[] = []
  private remoteDescSet = false

  private readonly myId: string
  private readonly peerId: string
  private readonly channelName: string
  private readonly initiator: boolean
  private readonly handlers: PeerHandlers

  constructor(
    myId: string,
    peerId: string,
    channelName: string,
    initiator: boolean,
    handlers: PeerHandlers,
  ) {
    this.myId = myId
    this.peerId = peerId
    this.channelName = channelName
    this.initiator = initiator
    this.handlers = handlers
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    this.pc.ontrack = (e) => {
      const [stream] = e.streams
      if (stream) this.handlers.onRemoteStream(stream)
    }

    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState
      if (s === 'connected') this.handlers.onConnected()
      if (s === 'failed' || s === 'closed' || s === 'disconnected') {
        this.handlers.onDisconnected()
      }
    }

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.send({ type: 'ice', candidate: e.candidate.toJSON(), from: this.myId })
      }
    }
  }

  async attachLocalStream(stream: MediaStream): Promise<void> {
    this.localStream = stream
    for (const track of stream.getTracks()) {
      this.pc.addTrack(track, stream)
    }
  }

  async start(): Promise<void> {
    this.channel = supabase.channel(this.channelName, {
      config: { broadcast: { ack: false, self: false } },
    })

    this.channel.on('broadcast', { event: 'signal' }, (payload) => {
      const msg = payload.payload as SignalMessage
      if (!msg || msg.from === this.myId) return
      void this.handleSignal(msg)
    })

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Realtime subscribe timeout')), 8000)
      this.channel!.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timer)
          resolve()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timer)
          reject(new Error('Realtime channel error: ' + status))
        }
      })
    })

    // small heartbeat so peers know each other are online
    this.send({ type: 'ready', from: this.myId })

    if (this.initiator) {
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
      await this.pc.setLocalDescription(offer)
      this.send({ type: 'offer', sdp: offer.sdp!, from: this.myId })
    }
  }

  private send(msg: SignalMessage): void {
    if (!this.channel) return
    void this.channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: msg,
    })
  }

  sendScore(value: number): void {
    this.send({ type: 'score', value, from: this.myId })
  }

  private async handleSignal(msg: SignalMessage): Promise<void> {
    if (this.destroyed) return
    switch (msg.type) {
      case 'ready':
        this.handlers.onPeerReady?.()
        // If we're initiator and somehow late, re-send offer.
        if (this.initiator && this.pc.signalingState === 'stable' && !this.remoteDescSet) {
          const offer = await this.pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          })
          await this.pc.setLocalDescription(offer)
          this.send({ type: 'offer', sdp: offer.sdp!, from: this.myId })
        }
        break
      case 'offer':
        await this.pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp })
        this.remoteDescSet = true
        await this.flushPendingCandidates()
        {
          const answer = await this.pc.createAnswer()
          await this.pc.setLocalDescription(answer)
          this.send({ type: 'answer', sdp: answer.sdp!, from: this.myId })
        }
        break
      case 'answer':
        await this.pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp })
        this.remoteDescSet = true
        await this.flushPendingCandidates()
        break
      case 'ice':
        if (this.remoteDescSet) {
          try {
            await this.pc.addIceCandidate(msg.candidate)
          } catch {
            /* ignore */
          }
        } else {
          this.pendingCandidates.push(msg.candidate)
        }
        break
      case 'score':
        this.handlers.onRemoteScore?.(msg.value)
        break
      case 'bye':
        this.handlers.onPeerBye?.()
        break
    }
  }

  private async flushPendingCandidates(): Promise<void> {
    while (this.pendingCandidates.length > 0) {
      const c = this.pendingCandidates.shift()!
      try {
        await this.pc.addIceCandidate(c)
      } catch {
        /* ignore */
      }
    }
  }

  getPeerId(): string {
    return this.peerId
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    try {
      this.send({ type: 'bye', from: this.myId })
    } catch {
      /* ignore */
    }
    try {
      this.pc.close()
    } catch {
      /* ignore */
    }
    if (this.channel) {
      void supabase.removeChannel(this.channel)
      this.channel = null
    }
    if (this.localStream) {
      // tracks are owned by the caller; don't stop them here
      this.localStream = null
    }
  }
}

export function makeChannelName(a: string, b: string): string {
  const [x, y] = [a, b].sort()
  return `match:${x}:${y}`
}
