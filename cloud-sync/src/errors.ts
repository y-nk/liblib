export class EtagMismatchError extends Error {
  constructor(path: string) {
    super(`Etag mismatch on ${path}`)
    this.name = 'EtagMismatchError'
  }
}

export class SyncConflictError extends Error {
  constructor(public readonly attempts: number) {
    super(`Sync conflict: gave up after ${attempts} attempts`)
    this.name = 'SyncConflictError'
  }
}

export class SchemaTooNewError extends Error {
  constructor(
    public readonly remoteVersion: number,
    public readonly localVersion: number,
  ) {
    super(
      `Remote schema version ${remoteVersion} is newer than local max ${localVersion}; update the app`,
    )
    this.name = 'SchemaTooNewError'
  }
}
