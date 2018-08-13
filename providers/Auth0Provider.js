const { ServiceProvider } = require('@adonisjs/fold') // eslint-disable-line
const Auth0 = require('../auth0/Auth0')

class Auth0Provider extends ServiceProvider {

  register() {
    const Env = use('Env')
    const isRedisActivated = !!Env.get('REDIS_PORT')

    this.app.bind('Auth0/providers/Auth0', () => new Auth0({
      Request: use('goabout/providers/Request'),
      Env,
      Errors: use('Errors'),
      Log: use('Log'),
      Raven: use('Raven'),
      Redis: isRedisActivated ? use('Redis') : null
    }))
  }

  static bare() { return Auth0 }

}


module.exports = Auth0Provider
