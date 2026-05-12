export type ProfileRow = {
  id: string
  handle: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  best_score: number
  mogx: number
  wins: number
  losses: number
  draws: number
  matches_played: number
  created_at: string
  updated_at: string
}

export type MatchRow = {
  id: string
  a_user_id: string
  b_user_id: string | null
  a_score: number | null
  b_score: number | null
  winner: 'a' | 'b' | 'draw' | 'abandoned' | null
  mogx_delta_a: number
  mogx_delta_b: number
  duration_ms: number
  created_at: string
}

export type AwardResult = { mogx_delta: number; new_mogx: number }
