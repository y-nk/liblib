import { createDomProvider } from './create-dom-provider'

export const getBookFromISBN = createDomProvider({
  id: 'cultura',
  urlTemplate: 'https://www.cultura.com/search/results?search_query={isbn}',
  getTitle: (doc) =>
    doc.querySelector('#navGlobalReferer .one-product__img img')?.getAttribute('alt'),
  getCover: (doc) =>
    doc.querySelector('#navGlobalReferer .one-product__img img')?.getAttribute('src'),
})
