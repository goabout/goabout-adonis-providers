const winston = require('winston')
const Papertrail = require('winston-papertrail').Papertrail

const initializeLogger = (loggingLevel, papertrailHost, papertrailPort, papertrailHostname, nodeEnv, CLS) => {
  const transports = [
    new (winston.transports.Console)({ colorize: true })
  ]

  // Leave the 1st element for log leve;l
  const logInfo = [null]

  if (papertrailHost && papertrailPort) {
    const winstonPapertrail = new Papertrail({
      host: papertrailHost,
      port: papertrailPort,
      hostname: papertrailHostname || undefined, // Hostname is used to make sure that papertrail does not create a new logger each time new machine is up in the interface
      level: loggingLevel,
      colorize: true,
      logFormat(level, message) {
        let formattedMessage = `${level}: ${message}`

        if (CLS) {
          const session = CLS.get('session')
          const userUid = CLS.get('userUid')

          const clsData = `${userUid ? userUid.slice(0, 10) : ''}${userUid && session ? '-' : ' '}${session || ''}`
          if (clsData) formattedMessage = `\u001b[35m${clsData}\u001b[39m ${formattedMessage}`
        }

        return formattedMessage
      }
    })


    logInfo.push(`Logging to ${winstonPapertrail.host}:${winstonPapertrail.port} as ${winstonPapertrail.hostname}`)

    transports.push(winstonPapertrail)
  }

  const logger = new (winston.Logger)({
    transports,
    level: loggingLevel
  })

  logger.cli()
  logInfo[0] = `Log level is ${logger.level}`

  logger.outputInfo = () => {
    logInfo.forEach(info => logger.info(info))
  }

  return logger
}

module.exports = initializeLogger
