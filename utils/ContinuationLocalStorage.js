const { AsyncLocalStorage } = require('async_hooks')
const uuid = require('uuid/v4')

const asyncLocalStorage = new AsyncLocalStorage()

class ContinuationLocalStorage {
  set(type, value) {
    const store = asyncLocalStorage.getStore()
    if (store) {
      store[type] = value
    } else {
      // eslint-disable-next-line no-console
      console.error('CLS was not found')
    }
  }

  get(type) {
    const store = asyncLocalStorage.getStore()
    return store ? store[type] : undefined
  }

  getAll() {
    return asyncLocalStorage.getStore() || {}
  }

  discharge() {
    asyncLocalStorage.disable()
  }
}

class ContinuationLocalStorageMiddleware {
  async handle(ctx, next) {
    const clsRes = {
      session: uuid().split('-')[4]
    }

    await asyncLocalStorage.run(clsRes, async () => {
      await next()
    })
  }
}

module.exports = { ContinuationLocalStorage, ContinuationLocalStorageMiddleware }
