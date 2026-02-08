export interface GamblingSettings {
  gambling_mode_enabled: boolean;
  daily_bet_limit?: number | null;
  max_single_bet?: number | null;
}

export interface UpdateSettingsResult {
  success: boolean;
  message: string;
}
