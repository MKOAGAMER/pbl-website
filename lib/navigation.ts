export function safeInternalPath(value: string | null | undefined, fallback = '/') {
  if (!value || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback;

  try {
    const trustedOrigin = 'https://pbl.invalid';
    const parsed = new URL(value, trustedOrigin);
    if (parsed.origin !== trustedOrigin || !parsed.pathname.startsWith('/')) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
