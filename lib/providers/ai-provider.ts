import type { Settings } from '../types'
import { Provider } from './provider'

export abstract class AiProvider extends Provider {
  readonly keyField: keyof Settings
  readonly keyPlaceholder: string

  constructor(id: string, name: string, keyField: keyof Settings, keyPlaceholder: string) {
    super(id, name)
    this.keyField = keyField
    this.keyPlaceholder = keyPlaceholder
  }
}
