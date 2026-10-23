export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function stripBasePath(path: string): string {
  if (!BASE_PATH) {
    return path || '/';
  }

  const normalized = path || '/';
  if (normalized === BASE_PATH) {
    return '/';
  }

  if (normalized.startsWith(`${BASE_PATH}/`)) {
    const stripped = normalized.slice(BASE_PATH.length);
    return stripped || '/';
  }

  return normalized;
}

/** Full browser URL path (includes basePath). Use with window.location.href. */
export function appPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${normalized}`;
}

/** Next.js Link / useRouter path (never include basePath). */
export function routerPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return stripBasePath(normalized);
}
