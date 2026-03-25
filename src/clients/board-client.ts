import type { TrelloClient } from 'trello.js'

export interface BoardMetadata {
  id: string
  name: string
  url: string
  shortUrl: string
  closed: boolean
  [key: string]: unknown
}

export class BoardClient {
  readonly id: string
  readonly name: string
  readonly metadata: BoardMetadata

  constructor(
    private readonly trello: TrelloClient,
    metadata: BoardMetadata,
  ) {
    this.id = metadata.id
    this.name = metadata.name
    this.metadata = metadata
  }

  async getLists() {
    return this.trello.boards.getBoardLists({ id: this.id })
  }

  async createList(name: string, opts?: { pos?: 'top' | 'bottom' | number }) {
    return this.trello.lists.createList({
      name,
      idBoard: this.id,
      ...opts,
    })
  }

  async getCards(filter: 'all' | 'closed' | 'none' | 'open' | 'visible' = 'visible') {
    return this.trello.boards.getBoardCardsFilter({ id: this.id, filter })
  }

  async createCard(listId: string, name: string, opts?: { desc?: string; pos?: 'top' | 'bottom' | number }) {
    return this.trello.cards.createCard({
      name,
      idList: listId,
      ...opts,
    })
  }

  async createChecklist(cardId: string, name: string) {
    return this.trello.checklists.createChecklist({
      idCard: cardId,
      name,
    })
  }

  async addChecklistItem(checklistId: string, name: string) {
    return this.trello.checklists.createChecklistCheckItems({
      id: checklistId,
      name,
    })
  }
}
