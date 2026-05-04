import { createDomProvider } from './create-dom-provider'

export const getBookFromISBN = createDomProvider({
  id: 'kinokuniya',
  urlTemplate: 'https://thailand.kinokuniya.com/products?is_searching=true&keywords={isbn}',
  getTitle: (doc) => doc.querySelector('.books span.title')?.textContent,
  getCover: (doc) => doc.querySelector('.books img.book-image')?.getAttribute('src'),
})
