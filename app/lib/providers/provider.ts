import type { Book } from '../types'

export abstract class Provider {
  readonly id: string
  readonly name: string

  constructor(id: string, name: string) {
    this.id = id
    this.name = name
  }

  abstract getBookFromISBN(isbn: string): Promise<Book[]>
}
