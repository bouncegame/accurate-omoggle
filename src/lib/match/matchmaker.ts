import { supabase } from '@/lib/supabase'

export type ClaimResult = {
  partner_id: string | null
  partner_handle: string | null
  channel: string
  is_initiator: boolean
}

export async function claimPartner(initialChannel: string): Promise<ClaimResult> {
  const { data, error } = await supabase.rpc('claim_match_partner', { p_channel: initialChannel })
  if (error) throw error
  // RPC returns table -> array of rows
  const row = Array.isArray(data) ? data[0] : data
  return {
    partner_id: row?.partner_id ?? null,
    partner_handle: row?.partner_handle ?? null,
    channel: row?.channel ?? initialChannel,
    is_initiator: Boolean(row?.is_initiator),
  }
}

export async function leaveQueue(): Promise<void> {
  await supabase.rpc('leave_matchmaking_queue').throwOnError()
}

export async function awardResult(
  opponentId: string,
  myScore: number,
  oppScore: number,
  durationMs: number,
): Promise<{ mogx_delta: number; new_mogx: number } | null> {
  const { data, error } = await supabase.rpc('award_match_result', {
    p_opponent_id: opponentId,
    p_my_score: myScore,
    p_opp_score: oppScore,
    p_duration_ms: durationMs,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return { mogx_delta: row.mogx_delta, new_mogx: row.new_mogx }
}
