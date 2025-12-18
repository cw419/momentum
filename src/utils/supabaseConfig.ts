/**
 * Supabase 配置检查 - 轻量级模块，不导入 Supabase SDK
 * 用于在加载重量级 SDK 之前判断是否需要 Supabase
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
