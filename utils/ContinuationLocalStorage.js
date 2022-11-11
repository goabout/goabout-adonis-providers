const { AsyncLocalStorage } = require('async_hooks')
const uuid = require('uuid/v4')

const asyncLocalStorage = new AsyncLocalStorage()

class ContinuationLocalStorage {
  set(type, value) {
    const store = asyncLocalStorage.getStore()
    store.type = value
  }

  get(type) {
    const store = asyncLocalStorage.getStore()
    return store[type]
  }

  discharge() {
    asyncLocalStorage.disable()
  }
}

class ContinuationLocalStorageMiddleware {
  async handle(ctx, next) {
    await asyncLocalStorage.run({}, async () => {
      asyncLocalStorage.set('session', uuid().split('-')[4])
      await next()
    })
  }
}

module.exports = { ContinuationLocalStorage, ContinuationLocalStorageMiddleware }
