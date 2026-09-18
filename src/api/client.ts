import type { ApiErrorBody, ApiErrorCode } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const TOKEN_KEY = 'ffc.token'
const EXPIRES_KEY = 'ffc.tokenExpiresAt'

/** The one endpoint exempt from the global 401 handler. */
const LOGIN_PATH = '/api/v1/auth/login'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    // Omitted rather than empty on non-validation failures.
    this.fieldErrors = body.fieldErrors ?? {}
  }

  /** True when the failure carries per-field messages to map onto a form. */
  get hasFieldErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0
  }
}

export const tokenStorage = {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },
  getExpiresAt(): string | null {
    return localStorage.getItem(EXPIRES_KEY)
  },
  set(token: string, expiresAt: string): void {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(EXPIRES_KEY, expiresAt)
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRES_KEY)
  },
}

/**
 * Called when any request other than login returns 401: the token is gone or
 * expired, so drop it and send the user to login. No re-auth modal, no
 * preserving in-progress page state.
 */
let onUnauthenticated: () => void = () => {}

export function setUnauthenticatedHandler(handler: () => void): void {
  onUnauthenticated = handler
}

/**
 * Drops keys whose value is `undefined`, so a PATCH body carries only the
 * fields the user actually touched. An explicit `null` survives and means
 * "clear this" — sending a full form object would wipe a transaction's
 * category, an account's bank, or a goal's target date.
 */
export function omitUntouched<T extends Record<string, unknown>>(body: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  ) as Partial<T>
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  /** Login opts out of the global 401 handling so it can show an inline error. */
  skipAuthRedirect?: boolean
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path, BASE_URL)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  return url.toString()
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, skipAuthRedirect = path === LOGIN_PATH } = options
  const token = tokenStorage.get()

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 401 && !skipAuthRedirect) {
    tokenStorage.clear()
    onUnauthenticated()
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorBody(response))
  }

  // 204 on password change and every DELETE.
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

async function readErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>
    if (typeof body.code === 'string' && typeof body.message === 'string') {
      return body as ApiErrorBody
    }
  } catch {
    // A proxy error or a dead backend won't return our error shape.
  }
  return {
    code: response.status === 401 ? 'UNAUTHENTICATED' : 'INTERNAL_ERROR',
    message: `Сервер вернул ошибку ${response.status}`,
  }
}
