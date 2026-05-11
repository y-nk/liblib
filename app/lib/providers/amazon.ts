import { DomProvider } from './dom-provider'

export class AmazonProvider extends DomProvider {
  constructor() {
    super(
      'amazon',
      'Amazon',
      'https://www.amazon.com/s?rh=p_66%3A{isbn}&ref=sr_adv_b',
      (doc) => doc.querySelector('[data-cy="title-recipe"] h2')?.getAttribute('aria-label'),
      (doc) => doc.querySelector('.s-product-image img.s-image')?.getAttribute('src'),
    )
  }
}
