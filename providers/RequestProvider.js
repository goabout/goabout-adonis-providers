const { ServiceProvider } = require('@adonisjs/fold') // eslint-disable-line
const originalRequest = require('request')
const Request = require('../request/Request')

class RequestProvider extends ServiceProvider {

  * register() {
    this.app.singleton('GoAbout/providers/Request', () => {
      const Env = use('Env')
      const isRedisActivated = !!Env.get('REDIS_PORT')
      return new Request(
        originalRequest,
        Env,
        use('Log'),
        use('Errors'),
        use('Raven'),
        isRedisActivated ? use('Redis') : null
      )
    })
  }

}

module.exports = RequestProvider
