import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE = "https://68b00f193b8db1ae9c028e80.mockapi.io/lockifyAuto";

function resolveUrl(url: string): string {
  if (url.startsWith("/api/")) {
    // Map app endpoints to MockAPI resource
    //   /api/records      -> /locifyauto
    //   /api/records/:id  -> /locifyauto/:id
    const after = url.replace(/^\/api\//, "");
    if (after === "records") {
      return API_BASE + "/locifyauto";
    }
    if (after.startsWith("records/")) {
      return API_BASE + "/locifyauto/" + after.slice("records/".length);
    }
    return API_BASE + "/" + after;
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
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    // Do not send credentials to MockAPI to avoid CORS issues
    credentials: "omit",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(resolveUrl(queryKey.join("/") as string), {
      credentials: "omit",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
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
