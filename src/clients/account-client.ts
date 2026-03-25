import { TrelloClient } from 'trello.js'
import { BoardClient, type BoardMetadata } from './board-client.js'

export interface AccountClientConfig {
  key: string
  token: string
}

export class AccountClient {
  private readonly trello: TrelloClient
  readonly boards: Map<string, BoardClient> = new Map()

  private constructor(config: AccountClientConfig) {
    this.trello = new TrelloClient(config)
  }

  static async create(config: AccountClientConfig): Promise<AccountClient> {
    const client = new AccountClient(config)
    const boards = await client.trello.members.getMemberBoards({
      id: 'me',
      filter: 'open',
    })

    for (const board of boards) {
      const metadata = board as unknown as BoardMetadata
      client.boards.set(metadata.id, new BoardClient(client.trello, metadata))
    }

    return client
  }

  getBoard(boardId: string): BoardClient | undefined {
    return this.boards.get(boardId)
  }

  async createBoard(name: string, opts?: { desc?: string; defaultLists?: boolean }): Promise<BoardClient> {
    const board = await this.trello.boards.createBoard({
      name,
      defaultLists: false,
      ...opts,
    })

    const metadata = board as unknown as BoardMetadata
    const boardClient = new BoardClient(this.trello, metadata)
    this.boards.set(metadata.id, boardClient)
    return boardClient
  }

  async closeBoard(boardId: string): Promise<void> {
    await this.trello.boards.updateBoard({
      id: boardId,
      closed: true,
    })
    this.boards.delete(boardId)
  }
}
