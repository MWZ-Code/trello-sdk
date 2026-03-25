/**
 * Typed error classes for Trello API failures.
 * Wraps AxiosError from trello.js into domain-specific errors.
 */

export class TrelloApiError extends Error {
  public readonly status: number
  public readonly trelloCode?: string

  constructor(message: string, status: number, trelloCode?: string) {
    super(message)
    this.name = 'TrelloApiError'
    this.status = status
    this.trelloCode = trelloCode
  }
}

export class TrelloAuthError extends TrelloApiError {
  constructor(message = 'Authentication failed — check API key and token') {
    super(message, 401)
    this.name = 'TrelloAuthError'
  }
}

export class TrelloNotFoundError extends TrelloApiError {
  constructor(message = 'Resource not found') {
    super(message, 404)
    this.name = 'TrelloNotFoundError'
  }
}

export class TrelloRateLimitError extends TrelloApiError {
  constructor(trelloCode?: string) {
    super('Rate limit exceeded — retry after 10 seconds', 429, trelloCode)
    this.name = 'TrelloRateLimitError'
  }
}

/** Convert an unknown error (typically AxiosError from trello.js) into a typed TrelloApiError. */
export function normalizeTrelloError(err: unknown): TrelloApiError {
  if (err instanceof TrelloApiError) return err

  const axiosErr = err as { response?: { status?: number; data?: any }; message?: string }
  const status = axiosErr.response?.status ?? 0
  const data = axiosErr.response?.data
  const message = typeof data === 'string' ? data : axiosErr.message ?? 'Unknown Trello API error'

  switch (status) {
    case 401:
      return new TrelloAuthError(message)
    case 404:
      return new TrelloNotFoundError(message)
    case 429: {
      const code = typeof data === 'object' ? data?.error?.code : undefined
      return new TrelloRateLimitError(code)
    }
    default:
      return new TrelloApiError(message, status)
  }
}
