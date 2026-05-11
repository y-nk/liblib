import { DomProvider } from './dom-provider'

export class KinokuniyaProvider extends DomProvider {
  constructor() {
    super(
      'kinokuniya',
      'Kinokuniya',
      'https://thailand.kinokuniya.com/products?is_searching=true&keywords={isbn}',
      (doc) => doc.querySelector('.books span.title')?.textContent,
      (doc) => doc.querySelector('.books img.book-image')?.getAttribute('src'),
    )
  }
}
