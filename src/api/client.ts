/**
 * TrelloApiClient — typed wrapper around trello.js with error normalization
 * and transparent pagination.
 */

import { TrelloClient } from 'trello.js'
import { normalizeTrelloError } from './errors.js'
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
} from './types.js'
import type { CheckItem } from 'trello.js/out/api/models'

export interface TrelloApiClientConfig {
  key: string
  token: string
}

export class TrelloApiClient {
  private client: TrelloClient

  constructor(config: TrelloApiClientConfig) {
    this.client = new TrelloClient(config)
  }

  // ---------------------------------------------------------------------------
  // Internal: wrap every trello.js call with error normalization
  // ---------------------------------------------------------------------------

  private async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (err) {
      throw normalizeTrelloError(err)
    }
  }

  // ---------------------------------------------------------------------------
  // Boards
  // ---------------------------------------------------------------------------

  async getBoard(id: string): Promise<Board> {
    return this.call(() => this.client.boards.getBoard({ id }))
  }

  async createBoard(params: {
    name: string
    desc?: string
    defaultLists?: boolean
    idOrganization?: string
  }): Promise<Board> {
    return this.call(() => this.client.boards.createBoard(params))
  }

  async updateBoard(
    id: string,
    params: { name?: string; desc?: string; closed?: boolean },
  ): Promise<Board> {
    return this.call(() =>
      this.client.boards.updateBoard({ id, ...params } as any),
    )
  }

  async deleteBoard(id: string): Promise<void> {
    return this.call(() => this.client.boards.deleteBoard({ id }))
  }

  async getBoardLists(id: string): Promise<List[]> {
    return this.call(() => this.client.boards.getBoardLists({ id })) as Promise<List[]>
  }

  async getBoardCards(id: string): Promise<Card[]> {
    return this.call(() => this.client.boards.getBoardCards({ id })) as Promise<Card[]>
  }

  async getBoardMembers(id: string): Promise<Member[]> {
    return this.call(() => this.client.boards.getBoardMembers({ id })) as Promise<Member[]>
  }

  async getBoardLabels(id: string): Promise<Label[]> {
    return this.call(() => this.client.boards.getBoardLabels({ id })) as Promise<Label[]>
  }

  async getBoardChecklists(id: string): Promise<Checklist[]> {
    return this.call(() => this.client.boards.getBoardChecklists({ id })) as Promise<
      Checklist[]
    >
  }

  async getBoardActions(boardId: string, filter?: string): Promise<Action[]> {
    return this.call(() =>
      this.client.boards.getBoardActions({ boardId, filter } as any),
    ) as Promise<Action[]>
  }

  // ---------------------------------------------------------------------------
  // Boards — paginated fetches
  // ---------------------------------------------------------------------------

  /**
   * Fetch ALL cards on a board, transparently paginating if > 1,000.
   * Uses cursor-based pagination via the `before` parameter.
   */
  async getAllBoardCards(id: string): Promise<Card[]> {
    const allCards: Card[] = []
    let before: string | undefined

    while (true) {
      const params: any = { id }
      if (before) params.before = before

      const batch: Card[] = await this.call(() =>
        this.client.boards.getBoardCards(params),
      ) as Card[]

      allCards.push(...batch)

      if (batch.length < 1000) break
      before = batch[batch.length - 1].id
    }

    return allCards
  }

  // ---------------------------------------------------------------------------
  // Lists
  // ---------------------------------------------------------------------------

  async getList(id: string): Promise<List> {
    return this.call(() => this.client.lists.getList({ id })) as Promise<List>
  }

  async createList(params: {
    name: string
    idBoard: string
    pos?: 'top' | 'bottom' | number
  }): Promise<List> {
    return this.call(() => this.client.lists.createList(params))
  }

  async updateList(
    id: string,
    params: { name?: string; closed?: boolean; pos?: 'top' | 'bottom' | number },
  ): Promise<List> {
    return this.call(() =>
      this.client.lists.updateList({ id, ...params } as any),
    ) as Promise<List>
  }

  async archiveList(id: string): Promise<List> {
    return this.updateList(id, { closed: true })
  }

  async unarchiveList(id: string): Promise<List> {
    return this.updateList(id, { closed: false })
  }

  async getListCards(id: string): Promise<Card[]> {
    return this.call(() => this.client.lists.getListCards({ id }))
  }

  // ---------------------------------------------------------------------------
  // Cards
  // ---------------------------------------------------------------------------

  async getCard(id: string): Promise<Card> {
    return this.call(() => this.client.cards.getCard({ id }))
  }

  async createCard(params: {
    name: string
    idList: string
    desc?: string
    pos?: 'top' | 'bottom' | number
    due?: string
    idMembers?: string[]
    idLabels?: string[]
  }): Promise<Card> {
    return this.call(() => this.client.cards.createCard(params))
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
    return this.call(() => this.client.cards.updateCard({ id, ...params }))
  }

  async deleteCard(id: string): Promise<void> {
    return this.call(() => this.client.cards.deleteCard({ id })) as any
  }

  async archiveCard(id: string): Promise<Card> {
    return this.updateCard(id, { closed: true })
  }

  async unarchiveCard(id: string): Promise<Card> {
    return this.updateCard(id, { closed: false })
  }

  async moveCard(id: string, idList: string, pos?: 'top' | 'bottom' | number): Promise<Card> {
    return this.updateCard(id, { idList, pos })
  }

  // Card — comments

  async addComment(cardId: string, text: string): Promise<Action> {
    return this.call(() =>
      this.client.cards.addCardComment({ id: cardId, text }),
    )
  }

  async updateComment(cardId: string, idAction: string, text: string): Promise<Action> {
    return this.call(() =>
      this.client.cards.updateCardComment({ id: cardId, idAction, text } as any),
    ) as Promise<Action>
  }

  async deleteComment(cardId: string, idAction: string): Promise<void> {
    return this.call(() =>
      this.client.cards.deleteCardComment({ id: cardId, idAction } as any),
    ) as any
  }

  // Card — attachments

  async getCardAttachments(id: string): Promise<Attachment[]> {
    return this.call(() => this.client.cards.getCardAttachments({ id }))
  }

  async addAttachment(
    cardId: string,
    params: { url?: string; name?: string },
  ): Promise<Attachment> {
    return this.call(() =>
      this.client.cards.createCardAttachment({ id: cardId, ...params }),
    )
  }

  async deleteAttachment(cardId: string, idAttachment: string): Promise<void> {
    return this.call(() =>
      this.client.cards.deleteCardAttachment({ id: cardId, idAttachment }),
    ) as any
  }

  // Card — labels

  async addLabelToCard(cardId: string, labelId: string): Promise<void> {
    return this.call(() =>
      this.client.cards.addCardLabel({ id: cardId, value: labelId } as any),
    ) as any
  }

  async removeLabelFromCard(cardId: string, labelId: string): Promise<void> {
    return this.call(() =>
      this.client.cards.deleteCardLabel({ id: cardId, idLabel: labelId } as any),
    ) as any
  }

  // Card — members

  async addMemberToCard(cardId: string, memberId: string): Promise<void> {
    return this.call(() =>
      this.client.cards.addCardMember({ id: cardId, value: memberId } as any),
    ) as any
  }

  async removeMemberFromCard(cardId: string, memberId: string): Promise<void> {
    return this.call(() =>
      this.client.cards.deleteCardMember({ id: cardId, idMember: memberId } as any),
    ) as any
  }

  // ---------------------------------------------------------------------------
  // Labels
  // ---------------------------------------------------------------------------

  async getLabel(id: string): Promise<Label> {
    return this.call(() => this.client.labels.getLabel({ id })) as Promise<Label>
  }

  async createLabel(params: {
    name: string
    color: string
    idBoard: string
  }): Promise<Label> {
    return this.call(() => this.client.labels.createLabel(params)) as Promise<Label>
  }

  async updateLabel(
    id: string,
    params: { name?: string; color?: string },
  ): Promise<Label> {
    return this.call(() =>
      this.client.labels.updateLabel({ id, ...params } as any),
    ) as Promise<Label>
  }

  async deleteLabel(id: string): Promise<void> {
    return this.call(() => this.client.labels.deleteLabel({ id })) as any
  }

  // ---------------------------------------------------------------------------
  // Members
  // ---------------------------------------------------------------------------

  async getMember(id: string): Promise<Member> {
    return this.call(() => this.client.members.getMember({ id })) as Promise<Member>
  }

  async getMe(): Promise<Member> {
    return this.getMember('me')
  }

  async getMyBoards(): Promise<Board[]> {
    return this.call(() => this.client.members.getMemberBoards({ id: 'me' }))
  }

  async getMemberCards(id: string): Promise<Card[]> {
    return this.call(() => this.client.members.getMemberCards({ id }))
  }

  async getMemberOrganizations(id: string): Promise<Organization[]> {
    return this.call(() =>
      this.client.members.getMemberOrganizations({ id }),
    ) as Promise<Organization[]>
  }

  // ---------------------------------------------------------------------------
  // Checklists
  // ---------------------------------------------------------------------------

  async getChecklist(id: string): Promise<Checklist> {
    return this.call(() => this.client.checklists.getChecklist({ id })) as Promise<
      Checklist
    >
  }

  async createChecklist(params: {
    idCard: string
    name: string
    pos?: 'top' | 'bottom' | number
  }): Promise<Checklist> {
    return this.call(() =>
      this.client.checklists.createChecklist(params),
    ) as Promise<Checklist>
  }

  async updateChecklist(
    id: string,
    params: { name?: string },
  ): Promise<Checklist> {
    return this.call(() =>
      this.client.checklists.updateChecklist({ id, ...params } as any),
    ) as Promise<Checklist>
  }

  async deleteChecklist(id: string): Promise<void> {
    return this.call(() =>
      this.client.checklists.deleteChecklist({ id }),
    ) as any
  }

  async getCheckItems(checklistId: string): Promise<CheckItem[]> {
    return this.call(() =>
      this.client.checklists.getChecklistCheckItems({ id: checklistId }),
    ) as Promise<CheckItem[]>
  }

  async createCheckItem(
    checklistId: string,
    params: { name: string; checked?: boolean; pos?: string },
  ): Promise<CheckItem> {
    return this.call(() =>
      this.client.checklists.createChecklistCheckItems({
        id: checklistId,
        ...params,
      }),
    ) as Promise<CheckItem>
  }

  async updateCheckItem(
    cardId: string,
    checkItemId: string,
    params: { state?: 'complete' | 'incomplete'; name?: string },
  ): Promise<CheckItem> {
    return this.call(() =>
      this.client.cards.updateCardCheckItem({
        id: cardId,
        idCheckItem: checkItemId,
        ...params,
      } as any),
    ) as Promise<CheckItem>
  }

  async deleteCheckItem(checklistId: string, checkItemId: string): Promise<void> {
    return this.call(() =>
      this.client.checklists.deleteChecklistCheckItem({
        id: checklistId,
        idCheckItem: checkItemId,
      }),
    ) as any
  }

  // ---------------------------------------------------------------------------
  // Batch
  // ---------------------------------------------------------------------------

  /**
   * Execute up to 10 GET requests in a single API call.
   * `urls` should be relative paths, e.g. ['/boards/abc123', '/cards/def456']
   */
  async batch(urls: string[]): Promise<Record<string, any>[]> {
    if (urls.length > 10) {
      throw new Error('Batch API supports a maximum of 10 URLs')
    }
    return this.call(() =>
      this.client.batch.getBatch({ urls: urls.join(',') }),
    ) as Promise<Record<string, any>[]>
  }
}
