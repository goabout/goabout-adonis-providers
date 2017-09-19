const { ServiceProvider } = require('@adonisjs/fold') // eslint-disable-line
const Utils = require('../utils/Utils')

class UtilsProvider extends ServiceProvider {

  register() {
    this.app.singleton('GoAbout/providers/Utils', () => new Utils(
      use('Log')
    ))
  }

  static bare(...args) { return new Utils(...args) }

}

module.exports = UtilsProvider
