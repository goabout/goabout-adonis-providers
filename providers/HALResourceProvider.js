const { ServiceProvider } = require('@adonisjs/fold')  // eslint-disable-line
const HALResource = require('../utils/HALResource')

class HALResourceProvider extends ServiceProvider {

  * register() {
    this.app.singleton('GoAbout/providers/HALResource', () => HALResource)
  }

  static bare() { return HALResource }

}


module.exports = HALResourceProvider
