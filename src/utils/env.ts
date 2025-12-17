export const mode = import.meta.env.MODE;

// Keep semantics aligned with previous `process.env.NODE_ENV === 'development'` checks:
// - `isDev` is only true for Vite's default dev mode ("development"), not for "test".
export const isDev = mode === 'development';
export const isTest = mode === 'test';
export const isProd = mode === 'production';
export const isNonProd = !isProd;

