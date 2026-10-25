import { API_BASE_URL, API_TIMEOUT_MS, USE_MOCK_API } from "./config";

export { API_BASE_URL, USE_MOCK_API };

export interface FieldIssue {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors: FieldIssue[] = [],
    public kind: "http" | "network" | "timeout" | "parse" = "http",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Reads FastAPI-style error bodies: {"detail": "..."} or 422 {"detail": [{loc, msg}]}. */
export function parseErrorBody(status: number, body: unknown): ApiError {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (Array.isArray(detail)) {
    const fieldErrors = detail.map((d: { loc?: unknown[]; msg?: string }) => ({
      field: Array.isArray(d?.loc) ? d.loc.filter((p) => p !== "body").join(".") : "",
      message: d?.msg ?? "Invalid value.",
    }));
    const first = fieldErrors[0];
    return new ApiError(status, first ? `Please check ${first.field || "your input"}: ${first.message}` : "Some fields are invalid.", fieldErrors);
  }
  if (typeof detail === "string" && detail) return new ApiError(status, detail);
  if (status >= 500) return new ApiError(status, `The server had a problem (${status}). Please try again shortly.`);
  if (status === 404) return new ApiError(status, "That feature isn't available on the server yet (404).");
  return new ApiError(status, `The server returned an error (${status}).`);
}

async function request<T>(path: string, init: RequestInit = {}, retries = 1): Promise<T> {
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(isForm || !init.body ? {} : { "Content-Type": "application/json" }), ...(init.headers ?? {}) },
    });
  } catch (e) {
    clearTimeout(timer);
    if (retries > 0) {
      // Retry after slight delay for waking free instances
      await new Promise((r) => setTimeout(r, 1500));
      return request<T>(path, init, retries - 1);
    }
    if ((e as Error)?.name === "AbortError") {
      throw new ApiError(0, "The server took too long to respond. Free cloud instances may be waking up (takes ~30-50s)—please retry.", [], "timeout");
    }
    throw new ApiError(0, "Couldn't reach the server. Waking up free cloud instance... Please try again shortly.", [], "network");
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      if (res.ok) throw new ApiError(res.status, "The server sent a response we couldn't read.", [], "parse");
    }
  }
  if (!res.ok) throw parseErrorBody(res.status, body);
  return body as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
};

/** Mock responses are strictly disabled across the entire app. */
export const mockDelay = <T>(_value: T, _ms = 350): Promise<T> =>
  Promise.reject(new Error(`Demo mock mode has been purged. Connect to live FastAPI backend at ${API_BASE_URL}.`));

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
