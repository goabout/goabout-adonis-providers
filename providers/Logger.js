const ServiceProvider = require('adonis-fold').ServiceProvider // eslint-disable-line
const winston = require('winston')

const initializeLogger = loggingLevel => {
  const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ colorize: true })
    ],
    level: loggingLevel
  })

  logger.cli()

  return logger
}

class LoggerProvider extends ServiceProvider {
  * register() {
    this.app.singleton('GoAbout/providers/Logger', () => {
      const Env = use('Env')
      const loggingLevel = Env.get('LOGGING', 'error')
      return initializeLogger(loggingLevel)
    })
  }

  static bare(loggingLevel) { return initializeLogger(loggingLevel) }
}

module.exports = LoggerProvider
