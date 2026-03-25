/**
 * TrelloSDK — the single public entry point for the Trello SDK.
 *
 * Encapsulates the API client, SQLite database, sync engine, and event
 * dispatcher. Consumers subscribe to events and call mutation methods —
 * the internal data model is fully abstracted.
 */

import { TrelloApiClient } from './api/client.js'
import type {
  Board,
  Card,
  List,
  Label,
  Member,
  Checklist,
  Action,
  Attachment,
  Organization,
} from './api/types.js'
import type { CheckItem } from 'trello.js/out/api/models'
import { openDatabase, openMemoryDatabase } from './db/connection.js'
import { SyncPoller } from './sync/poller.js'
import { syncAllBoards, type SyncResult } from './sync/engine.js'
import type { SyncChangeSet } from './sync/types.js'
import { EventDispatcher } from './events/dispatcher.js'
import type { AccountEventSubscriber, BoardEventSubscriber } from './events/subscribers.js'
import type Database from 'better-sqlite3'

export interface TrelloSDKConfig {
  key: string
  token: string
  /** Path to the SQLite database file. Omit for in-memory database. */
  dbPath?: string
  /** Sync interval in milliseconds. Default: 60000. Pass 0 to disable auto-sync. */
  syncIntervalMs?: number
}

export class TrelloSDK {
  private readonly api: TrelloApiClient
  private readonly db: Database.Database
  private readonly dispatcher: EventDispatcher
  private poller: SyncPoller | null = null
  private readonly syncIntervalMs: number
  private destroyed = false

  private constructor(
    api: TrelloApiClient,
    db: Database.Database,
    syncIntervalMs: number,
  ) {
    this.api = api
    this.db = db
    this.syncIntervalMs = syncIntervalMs
    this.dispatcher = new EventDispatcher()
  }

  /**
   * Create a new TrelloSDK instance. This is the only way to instantiate the SDK.
   */
  static async create(config: TrelloSDKConfig): Promise<TrelloSDK> {
    const api = new TrelloApiClient({ key: config.key, token: config.token })
    const db = config.dbPath
      ? openDatabase('default', { dataDir: config.dbPath })
      : openMemoryDatabase()
    const syncIntervalMs = config.syncIntervalMs ?? 60000

    return new TrelloSDK(api, db, syncIntervalMs)
  }

  // ---------------------------------------------------------------------------
  // Subscription management
  // ---------------------------------------------------------------------------

  subscribe(subscriber: AccountEventSubscriber): void {
    this.dispatcher.addAccountSubscriber(subscriber)
  }

  unsubscribe(subscriber: AccountEventSubscriber): void {
    this.dispatcher.removeAccountSubscriber(subscriber)
  }

  subscribeToBoard(boardId: string, subscriber: BoardEventSubscriber): void {
    this.dispatcher.addBoardSubscriber(boardId, subscriber)
  }

  unsubscribeFromBoard(boardId: string, subscriber: BoardEventSubscriber): void {
    this.dispatcher.removeBoardSubscriber(boardId, subscriber)
  }

  // ---------------------------------------------------------------------------
  // Sync control
  // ---------------------------------------------------------------------------

  /** Start the sync poller at the configured interval. Runs an immediate sync first. */
  async startSync(): Promise<void> {
    if (this.destroyed) return
    if (this.poller) return // already running

    this.poller = new SyncPoller(this.db, this.api, {
      intervalMs: this.syncIntervalMs,
      onSync: (results) => {
        for (const result of results) {
          this.dispatchSyncChanges(result.changes)
        }
      },
    })
    await this.poller.start()
  }

  /** Stop the sync poller. */
  stopSync(): void {
    if (this.poller) {
      this.poller.stop()
      this.poller = null
    }
  }

  /** Run a one-shot sync of all boards. Works whether the poller is running or not. */
  async sync(): Promise<void> {
    if (this.destroyed) return
    const results = await syncAllBoards(this.db, this.api)
    for (const result of results) {
      this.dispatchSyncChanges(result.changes)
    }
  }

  /** Map a SyncChangeSet to events and dispatch to subscribers. */
  private dispatchSyncChanges(changes: SyncChangeSet): void {
    const now = new Date().toISOString()
    const { boardId } = changes

    // Account-level events
    for (const board of changes.boards.created) {
      this.dispatcher.dispatchAccountEvent({
        type: 'board:created', source: 'sync', timestamp: now, board,
      })
    }
    for (const board of changes.boards.updated) {
      this.dispatcher.dispatchAccountEvent({
        type: 'board:updated', source: 'sync', timestamp: now, board,
      })
    }
    for (const board of changes.boards.closed) {
      this.dispatcher.dispatchAccountEvent({
        type: 'board:closed', source: 'sync', timestamp: now, board,
      })
    }
    for (const id of changes.boards.deleted) {
      this.dispatcher.dispatchAccountEvent({
        type: 'board:deleted', source: 'sync', timestamp: now, boardId: id,
      })
    }

    // Board-level events (card mutations)
    for (const card of changes.cards.created) {
      this.dispatcher.dispatchBoardEvent(boardId, {
        type: 'card:created', source: 'sync', timestamp: now, card,
      })
    }
    for (const card of changes.cards.updated) {
      this.dispatcher.dispatchBoardEvent(boardId, {
        type: 'card:updated', source: 'sync', timestamp: now, card,
      })
    }
    for (const { card, previousListId, newListId } of changes.cards.moved) {
      this.dispatcher.dispatchBoardEvent(boardId, {
        type: 'card:moved', source: 'sync', timestamp: now, card, previousListId, newListId,
      })
    }
    for (const card of changes.cards.archived) {
      this.dispatcher.dispatchBoardEvent(boardId, {
        type: 'card:archived', source: 'sync', timestamp: now, card,
      })
    }
    for (const cardId of changes.cards.deleted) {
      this.dispatcher.dispatchBoardEvent(boardId, {
        type: 'card:deleted', source: 'sync', timestamp: now, cardId, boardId,
      })
    }
    for (const card of changes.cards.dueDateChanged) {
      this.dispatcher.dispatchBoardEvent(boardId, {
        type: 'card:due_date', source: 'sync', timestamp: now, card,
      })
    }
  }

  /** Whether the sync poller is currently active. */
  get isSyncing(): boolean {
    return this.poller?.isRunning ?? false
  }

  // ---------------------------------------------------------------------------
  // Board mutations (emit account events on 200 ack)
  // ---------------------------------------------------------------------------

  async createBoard(params: {
    name: string
    desc?: string
    defaultLists?: boolean
    idOrganization?: string
  }): Promise<Board> {
    const board = await this.api.createBoard(params)
    this.dispatcher.dispatchAccountEvent({
      type: 'board:created',
      source: 'mutation',
      timestamp: new Date().toISOString(),
      board,
    })
    return board
  }

  async updateBoard(
    id: string,
    params: { name?: string; desc?: string; closed?: boolean },
  ): Promise<Board> {
    const board = await this.api.updateBoard(id, params)
    this.dispatcher.dispatchAccountEvent({
      type: 'board:updated',
      source: 'mutation',
      timestamp: new Date().toISOString(),
      board,
    })
    return board
  }

  async closeBoard(id: string): Promise<Board> {
    const board = await this.api.updateBoard(id, { closed: true })
    this.dispatcher.dispatchAccountEvent({
      type: 'board:closed',
      source: 'mutation',
      timestamp: new Date().toISOString(),
      board,
    })
    return board
  }

  async deleteBoard(id: string): Promise<void> {
    await this.api.deleteBoard(id)
    this.dispatcher.dispatchAccountEvent({
      type: 'board:deleted',
      source: 'mutation',
      timestamp: new Date().toISOString(),
      boardId: id,
    })
  }

  // ---------------------------------------------------------------------------
  // Card mutations (emit board events on 200 ack)
  // ---------------------------------------------------------------------------

  async createCard(params: {
    name: string
    idList: string
    desc?: string
    pos?: 'top' | 'bottom' | number
    due?: string
    idMembers?: string[]
    idLabels?: string[]
  }): Promise<Card> {
    const card = await this.api.createCard(params)
    this.dispatcher.dispatchBoardEvent(card.idBoard, {
      type: 'card:created',
      source: 'mutation',
      timestamp: new Date().toISOString(),
      card,
    })
    return card
  }

  async updateCard(
    id: string,
    params: {
      name?: string
      desc?: string
      closed?: boolean
      idList?: string
      idBoard?: string
      pos?: 'top' | 'bottom' | number
      due?: string | null
      dueComplete?: boolean
    },
  ): Promise<Card> {
    const card = await this.api.updateCard(id, params)
    this.dispatcher.dispatchBoardEvent(card.idBoard, {
      type: 'card:updated',
      source: 'mutation',
      timestamp: new Date().toISOString(),
      card,
    })
    return card
  }

  async moveCard(
    id: string,
    idList: string,
    pos?: 'top' | 'bottom' | number,
  ): Promise<Card> {
    // Fetch current card to get previousListId before the move
    const before = await this.api.getCard(id)
    const card = await this.api.moveCard(id, idList, pos)
    this.dispatcher.dispatchBoardEvent(card.idBoard, {
      type: 'card:moved',
      source: 'mutation',
      timestamp: new Date().toISOString(),
      card,
      previousListId: before.idList,
      newListId: idList,
    })
    return card
  }

  async archiveCard(id: string): Promise<Card> {
    const card = await this.api.archiveCard(id)
    this.dispatcher.dispatchBoardEvent(card.idBoard, {
      type: 'card:archived',
      source: 'mutation',
      timestamp: new Date().toISOString(),
      card,
    })
    return card
  }

  async deleteCard(id: string): Promise<void> {
    // Fetch card to get boardId before deletion
    const card = await this.api.getCard(id)
    await this.api.deleteCard(id)
    this.dispatcher.dispatchBoardEvent(card.idBoard, {
      type: 'card:deleted',
      source: 'mutation',
      timestamp: new Date().toISOString(),
      cardId: id,
      boardId: card.idBoard,
    })
  }

  // ---------------------------------------------------------------------------
  // Read-only proxies (no events emitted)
  // ---------------------------------------------------------------------------

  async getBoard(id: string): Promise<Board> {
    return this.api.getBoard(id)
  }

  async getMyBoards(): Promise<Board[]> {
    return this.api.getMyBoards()
  }

  async getBoardLists(boardId: string): Promise<List[]> {
    return this.api.getBoardLists(boardId)
  }

  async getBoardCards(boardId: string): Promise<Card[]> {
    return this.api.getBoardCards(boardId)
  }

  async getBoardMembers(boardId: string): Promise<Member[]> {
    return this.api.getBoardMembers(boardId)
  }

  async getBoardLabels(boardId: string): Promise<Label[]> {
    return this.api.getBoardLabels(boardId)
  }

  async getCard(id: string): Promise<Card> {
    return this.api.getCard(id)
  }

  async getMe(): Promise<Member> {
    return this.api.getMe()
  }

  // ---------------------------------------------------------------------------
  // List operations (no events emitted — future extension)
  // ---------------------------------------------------------------------------

  async createList(params: {
    name: string
    idBoard: string
    pos?: 'top' | 'bottom' | number
  }): Promise<List> {
    return this.api.createList(params)
  }

  async updateList(
    id: string,
    params: { name?: string; closed?: boolean; pos?: 'top' | 'bottom' | number },
  ): Promise<List> {
    return this.api.updateList(id, params)
  }

  // ---------------------------------------------------------------------------
  // Label operations (no events emitted — future extension)
  // ---------------------------------------------------------------------------

  async createLabel(params: {
    name: string
    color: string
    idBoard: string
  }): Promise<Label> {
    return this.api.createLabel(params)
  }

  async updateLabel(
    id: string,
    params: { name?: string; color?: string },
  ): Promise<Label> {
    return this.api.updateLabel(id, params)
  }

  async deleteLabel(id: string): Promise<void> {
    return this.api.deleteLabel(id)
  }

  // ---------------------------------------------------------------------------
  // Checklist operations (no events emitted — future extension)
  // ---------------------------------------------------------------------------

  async createChecklist(params: {
    idCard: string
    name: string
    pos?: 'top' | 'bottom' | number
  }): Promise<Checklist> {
    return this.api.createChecklist(params)
  }

  async createCheckItem(
    checklistId: string,
    params: { name: string; checked?: boolean; pos?: string },
  ): Promise<CheckItem> {
    return this.api.createCheckItem(checklistId, params)
  }

  async updateCheckItem(
    cardId: string,
    checkItemId: string,
    params: { state?: 'complete' | 'incomplete'; name?: string },
  ): Promise<CheckItem> {
    return this.api.updateCheckItem(cardId, checkItemId, params)
  }

  // ---------------------------------------------------------------------------
  // Comment operations (no events emitted — future extension)
  // ---------------------------------------------------------------------------

  async addComment(cardId: string, text: string): Promise<Action> {
    return this.api.addComment(cardId, text)
  }

  // ---------------------------------------------------------------------------
  // Attachment operations (no events emitted — future extension)
  // ---------------------------------------------------------------------------

  async getCardAttachments(cardId: string): Promise<Attachment[]> {
    return this.api.getCardAttachments(cardId)
  }

  async addAttachment(
    cardId: string,
    params: { url?: string; name?: string },
  ): Promise<Attachment> {
    return this.api.addAttachment(cardId, params)
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /** Stop sync, close DB, clear subscribers. Safe to call multiple times. */
  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.stopSync()
    this.dispatcher.clear()
    this.db.close()
  }
}
