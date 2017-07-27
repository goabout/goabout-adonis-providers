const ServiceProvider = require('adonis-fold').ServiceProvider // eslint-disable-line
const Errors = require('../errors/Errors')

class ErrorsProvider extends ServiceProvider {

  * register() {
    this.app.singleton('GoAbout/providers/Errors', () => Errors)
  }

  static bare() { return Errors }

}

module.exports = ErrorsProvider