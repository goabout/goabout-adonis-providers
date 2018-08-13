const { ServiceProvider } = require('@adonisjs/fold') // eslint-disable-line
const GoAbout = require('../goabout/GoAbout')

class GoAboutProvider extends ServiceProvider {

  register() {
    this.app.bind('GoAbout/providers/GoAbout', () => new GoAbout({
      Request: use('GoAbout/providers/Request'),
      Env: use('Env'),
      Errors: use('Errors'),
      Log: use('Log'),
      Raven: use('Raven'),
      Validator: use('Validator')
    }))
  }

  static bare() { return GoAbout }

}


module.exports = GoAboutProvider
