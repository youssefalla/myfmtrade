export type Role = 'master' | 'trader'

export interface Profile {
  id: string
  full_name: string
  role: Role
  city: string | null
  bio: string | null
  created_at: string
}

export interface Gig {
  id: string
  master_id: string
  style: string | null
  instruments: string[]
  performance_fee: number
  is_active: boolean
  roi_30d: number
  win_rate: number
  created_at: string
  profiles?: Profile
}

export interface Follow {
  id: string
  trader_id: string
  master_id: string
  created_at: string
}

export interface Trade {
  id: string
  master_id: string
  pair: string
  direction: 'BUY' | 'SELL'
  pnl_pips: number
  result: 'WIN' | 'LOSS' | 'OPEN'
  opened_at: string
  closed_at: string | null
}
