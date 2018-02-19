const { ServiceProvider } = require('@adonisjs/fold') // eslint-disable-line

const Errors = require('../errors/Errors')

class ErrorsProvider extends ServiceProvider {

  register() {
    const CLS = use('GoAbout/providers/ContinuationLocalStorage')
    const Antl = use('Antl')
    const Raven = use('GoAbout/providers/Raven')

    this.app.singleton('GoAbout/providers/Errors', () => new Errors(Antl, Raven, CLS))
  }

  static bare() { return Errors }

}

module.exports = ErrorsProvider
