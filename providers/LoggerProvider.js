const { ServiceProvider } = require('@adonisjs/fold') // eslint-disable-line
const Logger = require('../utils/Logger')

class LoggerProvider extends ServiceProvider {
  * register() {
    this.app.singleton('GoAbout/providers/Logger', () => {
      const Env = use('Env')
      const loggingLevel = Env.get('LOGGING', 'error')
      const papertrailHost = Env.get('PAPERTRAIL_HOST', null)
      const papertrailPort = Env.get('PAPERTRAIL_PORT', null)
      const papertrailHostname = Env.get('PAPERTRAIL_HOSTNAME', null)
      return Logger(loggingLevel, papertrailHost, papertrailPort, papertrailHostname)
    })
  }

  static bare(loggingLevel) { return Logger(loggingLevel) }
}

module.exports = LoggerProvider
