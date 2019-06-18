const { ServiceProvider } = require('@adonisjs/fold') // eslint-disable-line
const GoAbout = require('../goabout/GoAbout')

class GoAboutProvider extends ServiceProvider {
  register() {
    const Env = use('Env')
    const isAuth0Present = !!Env.get('OAUTH_CLIENT_ID')

    this.app.bind('GoAbout/providers/GoAbout', () => new GoAbout({
      Request: use('GoAbout/providers/Request'),
      Env,
      Errors: use('Errors'),
      Log: use('Log'),
      Raven: use('Raven'),
      Validator: use('Validator'),
      Auth0: isAuth0Present ? use('Auth0') : null,
      HALResource: use('HALResource'),
    }))
  }

  static bare() { return GoAbout }
}


module.exports = GoAboutProvider
