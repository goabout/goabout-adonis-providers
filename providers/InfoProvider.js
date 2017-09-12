const { ServiceProvider } = require('@adonisjs/fold')  // eslint-disable-line
const Info = require('../utils/Info')

class InfoProvider extends ServiceProvider {

  * register() {
    this.app.singleton('GoAbout/providers/Info', () => new Info())
  }

  static bare() { return Info }

}


module.exports = InfoProvider
