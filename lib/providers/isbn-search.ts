import { createDomProvider } from './create-dom-provider'

export const getBookFromISBN = createDomProvider({
  id: 'isbnSearch',
  urlTemplate: 'https://isbnsearch.org/isbn/{isbn}',
  getTitle: (doc) => doc.querySelector('div.bookinfo h1')?.textContent,
  getCover: (doc) => doc.querySelector('div.image img')?.getAttribute('src'),
})
