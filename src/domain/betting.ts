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
