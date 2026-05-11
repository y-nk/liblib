import { DomProvider } from './dom-provider'

export class CulturaProvider extends DomProvider {
  constructor() {
    super(
      'cultura',
      'Cultura',
      'https://www.cultura.com/search/results?search_query={isbn}',
      (doc) => doc.querySelector('#navGlobalReferer .one-product__img img')?.getAttribute('alt'),
      (doc) => doc.querySelector('#navGlobalReferer .one-product__img img')?.getAttribute('src'),
    )
  }
}
