const { ServiceProvider } = require('@adonisjs/fold') // eslint-disable-line
const Logger = require('../utils/Logger')
const RequestLogger = require('../utils/RequestLoggerMiddleware')

class LoggerProvider extends ServiceProvider {
  register() {
    this.app.bind('GoAbout/Middleware/RequestLogger', () => new RequestLogger(
      use('Log')
    ))

    this.app.singleton('GoAbout/providers/Logger', () => {
      const Env = use('Env')
      const loggingLevel = Env.get('LOGGING', 'error')
      const papertrailHost = Env.get('PAPERTRAIL_HOST', null)
      const papertrailPort = Env.get('PAPERTRAIL_PORT', null)
      const papertrailHostname = Env.get('PAPERTRAIL_HOSTNAME', null)
      const nodeEnv = Env.get('NODE_ENV', 'production')
      const CLS = use('GoAbout/providers/ContinuationLocalStorage')
      return Logger(loggingLevel, papertrailHost, papertrailPort, papertrailHostname, nodeEnv, CLS)
    })
  }

  static bare(loggingLevel) { return Logger(loggingLevel) }
}

module.exports = LoggerProvider
