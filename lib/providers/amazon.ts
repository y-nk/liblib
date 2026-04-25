import { createDomProvider } from './create-dom-provider'

export const getBookFromISBN = createDomProvider({
  id: 'amazon',
  urlTemplate: 'https://www.amazon.com/s?rh=p_66%3A{isbn}&ref=sr_adv_b',
  getTitle: (doc) => doc.querySelector('[data-cy="title-recipe"] h2')?.getAttribute('aria-label'),
  getCover: (doc) => doc.querySelector('.s-product-image img.s-image')?.getAttribute('src'),
})
