export function enforceOriginProtection({
  pathname,
  headers,
  env,
}: {
  pathname: string;
  headers: Headers;
  env: Record<string, string | undefined>;
}) {
  const expectedToken = env.ORIGIN_VERIFY_TOKEN?.trim();
  const headerName = env.ORIGIN_VERIFY_HEADER?.trim().toLowerCase();

  if (!expectedToken || !headerName) {
    return { allowed: true as const };
  }

  if (pathname.startsWith('/_next/')) {
    const candidate = headers.get(headerName);
    return candidate === expectedToken
      ? { allowed: true as const }
      : { allowed: false as const, status: 403 };
  }

  const candidate = headers.get(headerName);

  if (candidate === expectedToken) {
    return { allowed: true as const };
  }

  return { allowed: false as const, status: 403 };
}
