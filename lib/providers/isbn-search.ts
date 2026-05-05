import { DomProvider } from './dom-provider'

export class IsbnSearchProvider extends DomProvider {
  constructor() {
    super(
      'isbnSearch',
      'ISBN Search',
      'https://isbnsearch.org/isbn/{isbn}',
      (doc) => doc.querySelector('div.bookinfo h1')?.textContent,
      (doc) => doc.querySelector('div.image img')?.getAttribute('src'),
    )
  }
}
