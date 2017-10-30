const { ServiceProvider } = require('@adonisjs/fold') // eslint-disable-line
const { ContinuationLocalStorage, ContinuationLocalStorageMiddleware } = require('../utils/ContinuationLocalStorage')

class ContinuationLocalStorageProvider extends ServiceProvider {

  register() {
    this.app.singleton('GoAbout/providers/ContinuationLocalStorage', () => new ContinuationLocalStorage())

    this.app.bind('GoAbout/Middleware/ContinuationLocalStorage', () => new ContinuationLocalStorageMiddleware())
  }

  static bare() { return ContinuationLocalStorage }

}

module.exports = ContinuationLocalStorageProvider
