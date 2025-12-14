export interface BetPlacementRequest {
  session_id: string;
  bet_amount: number;
}

export interface BetPlacementResult {
  success: boolean;
  message: string;
  bet_id?: string;
  bet_amount?: number;
  potential_payout?: number;
  points_before?: number;
  points_after?: number;
  session_id?: string;
  chain_id?: string;
  error_code?: string;
  max_bet?: number;
  daily_limit?: number;
  daily_spent?: number;
  current_points?: number;
  required_points?: number;
  existing_bet_id?: string;
  existing_bet_amount?: number;
}

export interface BetSettlementResult {
  success: boolean;
  message: string;
  bet_id?: string;
  bet_amount?: number;
  payout?: number;
  task_successful?: boolean;
  points_before?: number;
  points_after?: number;
  bet_status?: string;
  error_code?: string;
  current_status?: string;
}

export interface GamblingStats {
  user_id: string;
  gambling_enabled: boolean;
  current_points: number;
  total_bets: number;
  total_wagered: number;
  total_won: number;
  total_lost: number;
  net_profit: number;
  win_rate: number;
  biggest_win: number;
  biggest_loss: number;
  current_streak: number;
}

export interface BettingHistoryEntry {
  id: string;
  session_id: string;
  chain_id: string;
  chain_name: string;
  bet_amount: number;
  bet_status: 'pending' | 'won' | 'lost' | 'cancelled' | 'refunded';
  potential_payout: number;
  actual_payout: number | null;
  points_before: number;
  points_after: number | null;
  created_at: string;
  settled_at: string | null;
  metadata: Record<string, unknown>;
}

export interface BettingHistory {
  bets: BettingHistoryEntry[];
  total_count: number;
  page_size: number;
  page_offset: number;
  has_more: boolean;
}

