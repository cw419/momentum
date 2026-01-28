import React, { useState } from 'react';
import { useStorage } from '../storage/useStorage';
import { logger } from '../utils/logger';
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useI18n } from '../i18n';
import { getSafeErrorDetail, getSafeErrorDetailFromUnknown } from '../utils/errorMessage';

interface AuthFormProps {
    initialIsSignUp?: boolean;
    onBack?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ initialIsSignUp = false, onBack }) => {
    const { language, tr } = useI18n();
    const [isSignUp, setIsSignUp] = useState(initialIsSignUp);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const storage = useStorage();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (storage.kind !== 'supabase') return;

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (isSignUp) {
                const result = await storage.signUp(email, password);
                if (result.ok) {
                    setSuccessMessage(tr('账号已创建！请检查邮箱完成确认。', 'Account created! Please check your email to confirm.'));
                    logger.info('AUTH', 'Sign up successful', { email });
                } else {
                    const safeDetail = getSafeErrorDetail(result.error.message, language);
                    setError(safeDetail ?? tr('注册失败，请重试（详情见控制台）', 'Sign up failed. Check the console for details, then try again.'));
                    logger.error('AUTH', 'Sign up failed', undefined, new Error(result.error.message));
                }
            } else {
                const result = await storage.signIn(email, password);
                if (result.ok) {
                    logger.info('AUTH', 'Sign in successful', { email });
                } else {
                    const safeDetail = getSafeErrorDetail(result.error.message, language);
                    setError(safeDetail ?? tr('登录失败，请重试（详情见控制台）', 'Sign in failed. Check the console for details, then try again.'));
                    logger.error('AUTH', 'Sign in failed', undefined, new Error(result.error.message));
                }
            }
        } catch (err: unknown) {
            const safeDetail = getSafeErrorDetailFromUnknown(err, language);
            setError(safeDetail ?? tr('发生了意外错误（详情见控制台）', 'An unexpected error occurred. Check the console for details.'));
            const errToLog = err instanceof Error ? err : new Error(String(err));
            logger.error('AUTH', 'Unexpected error during auth', undefined, errToLog);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background font-sans transition-colors duration-500">
            <div className="w-full max-w-md">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label={tr('返回', 'Go back')}
                        className="mb-8 flex items-center space-x-2 text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 transition-colors pl-2"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-bold tracking-wide text-xs uppercase">{tr('返回', 'Back')}</span>
                    </button>
                )}

                <div className="glass-panel p-10 rounded-[40px] shadow-2xl">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-2">
                            {isSignUp ? tr('创建账号', 'Create Account') : tr('欢迎回来', 'Welcome Back')}
                        </h2>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {isSignUp
                                ? tr('开启你的掌控之旅', 'Start your journey to mastery')
                                : tr('输入账号信息以继续', 'Enter your credentials to continue')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold tracking-widest text-violet-600 dark:text-violet-400 uppercase ml-4">
                                {tr('邮箱', 'Email')}
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    spellCheck="false"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full h-14 pl-4 pr-4 bg-violet-50/50 dark:bg-violet-900/10 border border-violet-200/50 dark:border-violet-500/20 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-2xl outline-none transition text-slate-800 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    placeholder={tr('输入邮箱地址', 'Enter your email')}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold tracking-widest text-violet-600 dark:text-violet-400 uppercase ml-4">
                                {tr('密码', 'Password')}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                    spellCheck="false"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full h-14 pl-4 pr-12 bg-violet-50/50 dark:bg-violet-900/10 border border-violet-200/50 dark:border-violet-500/20 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-2xl outline-none transition text-slate-800 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    placeholder={tr('输入密码', 'Enter your password')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? tr('隐藏密码', 'Hide password') : tr('显示密码', 'Show password')}
                                    aria-pressed={showPassword}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50 rounded"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 flex items-start gap-3">
                                <AlertCircle className="text-[#FF3B30] shrink-0 mt-0.5" size={16} />
                                <p className="text-sm font-medium text-[#FF3B30]">{error}</p>
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 flex items-start gap-3">
                                <CheckCircle className="text-[#34C759] shrink-0 mt-0.5" size={16} />
                                <p className="text-sm font-medium text-[#34C759]">{successMessage}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition active:scale-95 shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 flex items-center justify-center space-x-2 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <span className="text-sm font-bold tracking-wide">
                                    {isSignUp ? tr('创建账号', 'Create Account') : tr('登录', 'Sign In')}
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {isSignUp ? tr('已有账号？', 'Already have an account?') : tr('没有账号？', "Don't have an account?")}{' '}
                            <button
                                type="button"
                                onClick={() => setIsSignUp(!isSignUp)}
                                aria-label={isSignUp ? tr('切换到登录', 'Switch to sign in') : tr('切换到注册', 'Switch to sign up')}
                                className="font-bold text-violet-600 dark:text-violet-400 hover:underline transition focus:outline-none focus:ring-2 focus:ring-violet-500/50 rounded"
                            >
                                {isSignUp ? tr('登录', 'Sign In') : tr('注册', 'Sign Up')}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
