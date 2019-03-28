const winston = require('winston')

const initializeLogger = (loggingLevel, nodeEnv, CLS) => {
  const printFormat = winston.format.printf(info => {
    const prependers = []

    if (CLS && nodeEnv === 'production') {
      const session = CLS.get('session')
      const userUid = CLS.get('userUid')
      const clsData = `${userUid ? userUid.slice(0, 10) : ''}${userUid && session ? '-' : ' '}${session || ''}`
      if (clsData) prependers.push(`\x1b[35m${clsData}\x1b[0m`)
    }

    return `${prependers.join(' ')} ${info.level} ${info.message}`
  })

  const consoleFormats = [
    winston.format.colorize(),
    winston.format.splat(),
    printFormat
  ]

  const transports = [
    new winston.transports.Console({
      format: winston.format.combine(...consoleFormats)
    })
  ]

  // Leave the 1st element for log leve;l
  const logInfo = [null]

  const logger = winston.createLogger({
    transports,
    level: loggingLevel
  })

  logInfo[0] = `Log level is ${logger.level}`

  logger.outputInfo = () => {
    logInfo.forEach(info => logger.info(info))
  }

  return logger
}

module.exports = initializeLogger
