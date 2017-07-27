const ServiceProvider = require('adonis-fold').ServiceProvider // eslint-disable-line
const GoAbout = require('../goabout/GoAbout')

class GoAboutProvider extends ServiceProvider {

  * register() {
    this.app.bind('GoAbout/providers/GoAboutApi', () => {
      const Env = use('Env')
      const isRedisActivated = !!Env.get('REDIS_PORT')

      return new GoAbout(
        use('GoAbout/providers/Request'),
        use('Env'),
        use('Errors'),
        use('Log'),
        use('Raven'),
        isRedisActivated ? use('Redis') : null
      )
    })
  }

  static bare() { return GoAbout }

}


module.exports = GoAboutProvider
