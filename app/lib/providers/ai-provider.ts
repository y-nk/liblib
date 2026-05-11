import type { Settings } from '../types'
import { Provider } from './provider'

export abstract class AiProvider extends Provider {
  constructor(
    id: string,
    name: string,
    readonly keyField: keyof Settings,
    readonly keyPlaceholder: string,
  ) {
    super(id, name)
  }
}
