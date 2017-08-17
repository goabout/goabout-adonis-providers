const ServiceProvider = require('adonis-fold').ServiceProvider // eslint-disable-line
const GoAbout = require('../goabout/GoAbout')

class GoAboutProvider extends ServiceProvider {

  * register() {
    this.app.bind('GoAbout/providers/GoAbout', () => new GoAbout(
        use('GoAbout/providers/Request'),
        use('Env'),
        use('Errors'),
        use('Log'),
        use('Raven'),
        use('Validator')
      ))
  }

  static bare() { return GoAbout }

}


module.exports = GoAboutProvider
