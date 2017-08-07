const winston = require('winston')

const initializeLogger = (loggingLevel, papertrailHost, papertrailPort) => {
  const transports = [
    new (winston.transports.Console)({ colorize: true })
  ]

  if (papertrailHost && papertrailPort) {
    const Papertrail = require('winston-papertrail').Papertrail

    const winstonPapertrail = new Papertrail({
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

module.exports = initializeLogger
