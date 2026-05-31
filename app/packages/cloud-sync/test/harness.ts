/**
 * Minimal test harness — no external dependency.
 *
 * The project hasn't picked a runner yet (the PRD calls for `vitest` or `jest`
 * but neither is installed; adding them would touch dev deps the orchestrator
 * doesn't want yet). This harness lets `*.test.ts` files compile under
 * `tsc --noEmit` and remain trivially adoptable once a runner lands —
 * `describe`/`it`/`expect` are the same names vitest and jest both expose.
 *
 * When a runner is added: delete this file and the imports will resolve
 * against the runner's globals instead. Until then, calling the test entry
 * point on its own will execute every registered case sequentially.
 */

type TestFn = () => void | Promise<void>

type Case = {
  name: string
  fn: TestFn
}

const queue: Case[] = []

export function describe(_name: string, body: () => void) {
  body()
}

export function it(name: string, fn: TestFn) {
  queue.push({ name, fn })
}

export function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`expected ${String(actual)} to be ${String(expected)}`)
      }
    },
    toEqual(expected: T) {
      const a = JSON.stringify(actual)
      const b = JSON.stringify(expected)

      if (a !== b) {
        throw new Error(`expected ${a} to equal ${b}`)
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`expected ${String(actual)} to be truthy`)
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`expected ${String(actual)} to be null`)
      }
    },
    toBeGreaterThan(n: number) {
      if (typeof actual !== 'number' || actual <= n) {
        throw new Error(`expected ${String(actual)} to be > ${n}`)
      }
    },
    toThrow(matcher?: (e: unknown) => boolean) {
      const fn = actual as unknown as () => unknown
      let caught: unknown
      try {
        const ret = fn()

        if (ret instanceof Promise) {
          throw new Error('use expectAsyncThrows for async functions')
        }
      } catch (e) {
        caught = e
      }

      if (!caught) {
        throw new Error('expected function to throw')
      }

      if (matcher && !matcher(caught)) {
        throw new Error(`thrown value did not match: ${String(caught)}`)
      }
    },
  }
}

export async function expectAsyncThrows(
  fn: () => Promise<unknown>,
  matcher?: (e: unknown) => boolean,
) {
  let caught: unknown

  try {
    await fn()
  } catch (e) {
    caught = e
  }

  if (!caught) {
    throw new Error('expected async function to throw')
  }

  if (matcher && !matcher(caught)) {
    throw new Error(`thrown value did not match: ${String(caught)}`)
  }
}

export async function runAll() {
  let passed = 0
  let failed = 0

  for (const c of queue) {
    try {
      await c.fn()
      passed += 1
      // eslint-disable-next-line no-console
      console.log(`  ok  ${c.name}`)
    } catch (e) {
      failed += 1
      // eslint-disable-next-line no-console
      console.log(`  FAIL ${c.name}\n    ${e instanceof Error ? e.message : e}`)
    }
  }

  return { passed, failed }
}
