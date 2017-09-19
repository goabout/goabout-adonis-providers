const { ServiceProvider } = require('@adonisjs/fold') // eslint-disable-line
const Raven = require('raven')
const FakeRaven = require('../utils/FakeRaven')

class RavenProvider extends ServiceProvider {

  register() {
    this.app.singleton('GoAbout/providers/Raven', () => {
      const Env = use('Env')
      const Log = use('Log')
      const ravenToken = Env.get('RAVEN', null)
      let ravenInstance = null

      if (ravenToken) {
        Raven.config(ravenToken).install()
        ravenInstance = Raven
      } else {
        ravenInstance = new FakeRaven()
      }

      ravenInstance.status = () => {
        if (ravenToken) Log.info('Raven is active')
        if (!ravenToken) Log.info('Raven is disabled')
        if (Env.get('NODE_ENV') === 'production' && !ravenToken) Log.error('Raven not active on production!')
      }


      return ravenInstance
    })
  }

  static bare() { return FakeRaven }
}


module.exports = RavenProvider
