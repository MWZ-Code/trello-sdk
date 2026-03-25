/**
 * Poller — runs sync on a configurable interval.
 */

import type Database from 'better-sqlite3'
import type { TrelloApiClient } from '../api/client.js'
import { syncAllBoards, type SyncResult } from './engine.js'

export interface PollerConfig {
  /** Sync interval in milliseconds. Default: 60000 (60 seconds). */
  intervalMs?: number
  /** Callback invoked after each sync cycle. */
  onSync?: (results: SyncResult[]) => void
  /** Callback invoked on sync error. */
  onError?: (error: Error) => void
}

export class SyncPoller {
  private db: Database.Database
  private api: TrelloApiClient
  private config: Required<PollerConfig>
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false

  constructor(db: Database.Database, api: TrelloApiClient, config: PollerConfig = {}) {
    this.db = db
    this.api = api
    this.config = {
      intervalMs: config.intervalMs ?? 60000,
      onSync: config.onSync ?? (() => {}),
      onError: config.onError ?? (() => {}),
    }
  }

  /** Start polling. Runs an immediate sync, then repeats on interval. */
  async start(): Promise<void> {
    if (this.timer) return // already running

    // Run immediately
    await this.tick()

    // Then schedule
    this.timer = setInterval(() => this.tick(), this.config.intervalMs)
  }

  /** Stop polling. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /** Whether the poller is currently active. */
  get isRunning(): boolean {
    return this.timer !== null
  }

  private async tick(): Promise<void> {
    if (this.running) return // skip if previous sync is still in progress
    this.running = true

    try {
      const results = await syncAllBoards(this.db, this.api)
      this.config.onSync(results)
    } catch (err) {
      this.config.onError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      this.running = false
    }
  }
}
