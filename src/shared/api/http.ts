import type { TokenPair } from './types'

const BASE = import.meta.env.VITE_API_URL || '/api/v1'

export class ApiError extends Error {
  status: number
  code: string
  fields: Record<string, string> | null

  constructor(status: number, detail: string, code = 'error', fields: Record<string, string> | null = null) {
    super(detail)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

type Query = Record<string, string | number | boolean | null | undefined | Array<string | number>>

export interface RequestOptions {
  query?: Query
  body?: unknown
  headers?: Record<string, string>
  idempotencyKey?: string
  /** не пытаться обновить токен (для самих auth-запросов) */
  noAuth?: boolean
}

// ---------- токены ----------
const STORAGE_KEY = 'kofe.tokens'
let tokens: TokenPair | null = readTokens()
let initDataProvider: (() => string) | null = null
let refreshing: Promise<boolean> | null = null
// Бэк отвечает 403 {code: "pin_required"}, если в токене не пройден второй фактор — админка покажет экран PIN
let pinRequiredHandler: (() => void) | null = null
export function onPinRequired(fn: () => void) {
  pinRequiredHandler = fn
}
function checkPin(e: unknown) {
  if (e instanceof ApiError && e.code === 'pin_required') pinRequiredHandler?.()
}

function readTokens(): TokenPair | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TokenPair) : null
  } catch {
    return null
  }
}

export function setTokens(t: TokenPair | null) {
  if (t && !t.refresh_token && tokens) t = { ...t, refresh_token: tokens.refresh_token }
  tokens = t
  try {
    if (t) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(t))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage недоступен — держим в памяти */
  }
}

export function hasTokens() {
  return !!tokens
}

export function currentAccessToken() {
  return tokens?.access_token ?? null
}

/** Чем авторизоваться заново, если refresh не сработал (обычно Telegram initData) */
export function setInitDataProvider(fn: () => string) {
  initDataProvider = fn
}

async function reauth(): Promise<boolean> {
  if (refreshing) return refreshing
  refreshing = (async () => {
    try {
      if (tokens?.refresh_token) {
        const t = await request<TokenPair>('POST', '/auth/refresh', {
          body: { refresh_token: tokens.refresh_token },
          noAuth: true,
        })
        setTokens(t)
        return true
      }
    } catch {
      /* падаем на initData */
    }
    if (initDataProvider) {
      try {
        const t = await request<TokenPair>('POST', '/auth/telegram', {
          body: { init_data: initDataProvider() },
          noAuth: true,
        })
        setTokens(t)
        return true
      } catch {
        /* ничего не вышло */
      }
    }
    setTokens(null)
    return false
  })()
  try {
    return await refreshing
  } finally {
    refreshing = null
  }
}

// ---------- запрос ----------
function buildQuery(q?: Query): string {
  if (!q) return ''
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)))
    else p.append(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function request<T>(method: string, path: string, opts: RequestOptions = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (tokens && !opts.noAuth) headers.Authorization = `Bearer ${tokens.access_token}`
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey

  let res: Response
  try {
    res = await fetch(BASE + path + buildQuery(opts.query), {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.', 'network')
  }

  if (res.status === 401 && !opts.noAuth && !retried) {
    if (await reauth()) return request<T>(method, path, opts, true)
  }

  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    // FastAPI: {detail: "..."} или {detail: [{loc, msg}]} для 422
    let detail = res.status >= 500 || data === null ? 'Сервер временно недоступен. Попробуйте через минуту.' : 'Что-то пошло не так'
    let fields: Record<string, string> | null = null
    if (typeof data?.detail === 'string') detail = data.detail
    else if (Array.isArray(data?.detail)) {
      fields = {}
      for (const e of data.detail) fields[String(e.loc?.at(-1) ?? '')] = e.msg
      detail = data.detail[0]?.msg ?? detail
    }
    const err = new ApiError(res.status, detail, data?.code ?? 'error', fields ?? data?.fields ?? null)
    checkPin(err)
    throw err
  }
  return data as T
}

export const http = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, extra?: Omit<RequestOptions, 'body'>) =>
    request<T>('POST', path, { ...extra, body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  del: <T = void>(path: string) => request<T>('DELETE', path),
}
