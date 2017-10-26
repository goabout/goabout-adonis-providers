const { createNamespace } = require('cls-hooked')
const uuid = require('uuid/v4')

const namespaceId = uuid()
const session = createNamespace(namespaceId)

class ContinuationLocalStorage {
  set(type, value) {
    return session.set(type, value)
  }

  get(type) {
    return session.get(type)
  }
}

class ContinuationLocalStorageMiddleware {
  async handle(ctx, next) {
    await session.runPromise(async () => {
      session.set('session', uuid().split('-')[4])
      await next()
    })
  }
}

module.exports = { ContinuationLocalStorage, ContinuationLocalStorageMiddleware }
