const { ServiceProvider } = require('@adonisjs/fold') // eslint-disable-line
const Raven = require('raven')
const _ = require('lodash')
const FakeRaven = require('../utils/FakeRaven')

class RavenProvider extends ServiceProvider {

  register() {
    this.app.singleton('GoAbout/providers/Raven', () => {
      const Env = use('Env')
      const Log = use('Log')
      const CLS = use('GoAbout/providers/ContinuationLocalStorage')
      const ravenToken = Env.get('RAVEN', null)
      let ravenInstance = null

      if (ravenToken) {
        Raven.config(ravenToken).install()
        ravenInstance = Raven

        Raven._captureException = Raven.captureException
        Raven.captureException = exception => {
          exception.session = CLS.get('session')

          Log.error(`${exception.name || ''} ${exception.message || ''} ${exception.details || ''}`)
          Log.error(JSON.stringify(_.omit(exception, 'stack')))
          Log.error(exception.stack)

          Raven._captureException(exception)
        }
      } else {
        ravenInstance = new FakeRaven(Log)
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
