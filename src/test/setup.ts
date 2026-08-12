import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

let uuidCounter = 1

Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: () => `00000000-0000-4000-8000-${String(uuidCounter++).padStart(12, '0')}` },
  configurable: true
})
