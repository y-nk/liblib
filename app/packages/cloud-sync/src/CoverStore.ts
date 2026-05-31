/**
 * Local cover storage surface. Implemented by:
 *  - the app, against `expo-file-system`'s document directory
 *  - tests, with an in-memory `Map<string, Uint8Array>`
 */
export type CoverStore = {
  list(): Promise<string[]>
  read(name: string): Promise<Uint8Array | null>
  write(name: string, data: Uint8Array): Promise<void>
}
