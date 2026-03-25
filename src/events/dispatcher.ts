/**
 * EventDispatcher — internal event routing for the Trello SDK.
 *
 * Manages subscriber registration and synchronous event dispatch.
 * A throwing subscriber does not prevent other subscribers from being notified.
 */

import type { AccountEvent, BoardEvent } from './types.js'
import type { AccountEventSubscriber, BoardEventSubscriber } from './subscribers.js'

const EVENT_TO_ACCOUNT_METHOD: Record<AccountEvent['type'], keyof AccountEventSubscriber> = {
  'board:created': 'onBoardCreated',
  'board:closed': 'onBoardClosed',
  'board:updated': 'onBoardUpdated',
  'board:deleted': 'onBoardDeleted',
}

const EVENT_TO_BOARD_METHOD: Record<BoardEvent['type'], keyof BoardEventSubscriber> = {
  'card:created': 'onCardCreated',
  'card:updated': 'onCardUpdated',
  'card:moved': 'onCardMoved',
  'card:archived': 'onCardArchived',
  'card:deleted': 'onCardDeleted',
  'card:due_date': 'onCardDueDate',
  'card:checklist_changed': 'onChecklistChanged',
}

export class EventDispatcher {
  private accountSubscribers = new Set<AccountEventSubscriber>()
  private boardSubscribers = new Map<string, Set<BoardEventSubscriber>>()

  addAccountSubscriber(subscriber: AccountEventSubscriber): void {
    this.accountSubscribers.add(subscriber)
  }

  removeAccountSubscriber(subscriber: AccountEventSubscriber): void {
    this.accountSubscribers.delete(subscriber)
  }

  addBoardSubscriber(boardId: string, subscriber: BoardEventSubscriber): void {
    let subs = this.boardSubscribers.get(boardId)
    if (!subs) {
      subs = new Set()
      this.boardSubscribers.set(boardId, subs)
    }
    subs.add(subscriber)
  }

  removeBoardSubscriber(boardId: string, subscriber: BoardEventSubscriber): void {
    const subs = this.boardSubscribers.get(boardId)
    if (subs) {
      subs.delete(subscriber)
      if (subs.size === 0) {
        this.boardSubscribers.delete(boardId)
      }
    }
  }

  dispatchAccountEvent(event: AccountEvent): void {
    const method = EVENT_TO_ACCOUNT_METHOD[event.type]
    for (const subscriber of this.accountSubscribers) {
      try {
        const fn = subscriber[method] as ((event: AccountEvent) => void) | undefined
        fn?.call(subscriber, event)
      } catch {
        // Catch and continue — a throwing subscriber must not block others
      }
    }
  }

  dispatchBoardEvent(boardId: string, event: BoardEvent): void {
    const subs = this.boardSubscribers.get(boardId)
    if (!subs) return

    const method = EVENT_TO_BOARD_METHOD[event.type]
    for (const subscriber of subs) {
      try {
        const fn = subscriber[method] as ((event: BoardEvent) => void) | undefined
        fn?.call(subscriber, event)
      } catch {
        // Catch and continue — a throwing subscriber must not block others
      }
    }
  }

  clear(): void {
    this.accountSubscribers.clear()
    this.boardSubscribers.clear()
  }
}
