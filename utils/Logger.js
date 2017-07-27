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

module.exports = initializeLogger
