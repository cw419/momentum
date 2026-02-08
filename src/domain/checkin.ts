export interface CheckinStats {
  user_id: string;
  total_points: number;
  total_checkins: number;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
  has_checked_in_today: boolean;
}

export interface CheckinResult {
  success: boolean;
  message: string;
  already_checked_in: boolean;
  checkin_date: string;
  points_earned: number;
  consecutive_days: number;
  total_points?: number;
  checkin_id?: string;
}
