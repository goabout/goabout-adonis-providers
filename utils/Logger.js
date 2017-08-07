const winston = require('winston')
const Papertrail = require('winston-papertrail').Papertrail

const initializeLogger = (loggingLevel, papertrailHost, papertrailPort, papertrailHostname) => {
  const transports = [
    new (winston.transports.Console)({ colorize: true })
  ]

  if (papertrailHost && papertrailPort) {
    const winstonPapertrail = new Papertrail({
      host: papertrailHost,
      port: papertrailPort,
      hostname: papertrailHostname || undefined // Hostname is used to make sure that papertrail does not create a new logger each time new machine is up in the interface
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
