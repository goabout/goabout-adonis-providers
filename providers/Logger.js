const ServiceProvider = require('adonis-fold').ServiceProvider // eslint-disable-line
const winston = require('winston')

const initializeLogger = (loggingLevel, papertrailHost, papertrailPort) => {
  const transports = [
    new (winston.transports.Console)({ colorize: true })
  ]

  if (papertrailHost && papertrailPort) {
    // Requiring `winston-papertrail` will expose `winston.transports.Papertrail`
    require('winston-papertrail').Papertrail //eslint-disable-line

    const winstonPapertrail = new winston.transports.Papertrail({
      host: papertrailHost,
      port: papertrailPort
    })

    transports.push(winstonPapertrail)
  }

  const logger = new (winston.Logger)({
    transports,
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
      const papertrailHost = Env.get('PAPERTRAIL_HOST', null)
      const papertrailPort = Env.get('PAPERTRAIL_PORT', null)
      return initializeLogger(loggingLevel, papertrailHost, papertrailPort)
    })
  }

  static bare(loggingLevel) { return initializeLogger(loggingLevel) }
}

module.exports = LoggerProvider
