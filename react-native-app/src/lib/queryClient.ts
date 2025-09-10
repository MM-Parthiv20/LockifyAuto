import { QueryClient, QueryFunction } from '@tanstack/react-query';

const API_BASE = 'https://68b00f193b8db1ae9c028e80.mockapi.io/lockifyAuto';

function resolveUrl(url: string): string {
  if (url.startsWith('/api/')) {
    const after = url.replace(/^\/api\//, '');
    if (after === 'records') return API_BASE + '/locifyauto';
    if (after.startsWith('records/')) return API_BASE + '/locifyauto/' + after.slice('records/'.length);
    if (after === 'users') return API_BASE + '/users';
    if (after.startsWith('users/')) return API_BASE + '/users/' + after.slice('users/'.length);
    return API_BASE + '/' + after;
  }
  return url;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(resolveUrl(url), {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'omit',
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = 'returnNull' | 'throw';
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(resolveUrl((queryKey as any).join('/') as string), {
      credentials: 'omit',
    });

    if (unauthorizedBehavior === 'returnNull' && (res as any).status === 401) {
      return null as any;
    }

    await throwIfResNotOk(res as any);
    return (await (res as any).json()) as any;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: 'throw' }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});


