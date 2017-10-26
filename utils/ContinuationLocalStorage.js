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
    session.run(() => {
      session.set('hui', 123)
      session.set('session', uuid())
      next()
    })
  }
}

module.exports = { ContinuationLocalStorage, ContinuationLocalStorageMiddleware }
