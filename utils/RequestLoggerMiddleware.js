
class RequestLogger {

  constructor(Log) {
    this.$Log = Log
  }

  async handle({ request }, next) {
    let stringifiedParams = {}

    try {
      stringifiedParams = JSON.stringify(request.all())
    } catch (e) {
      this.$Log.error('Unable to parse request body :-(')
    }

    const userAgent = request.headers()['user-agent'] || 'Not defined'
    if (userAgent.match(/pingdom|curl|pingdisco|uptimerobot/ig)) return next()

    this.$Log.debug(`<!> Request to ${request.url()} with params ${stringifiedParams}, made by ${userAgent}, lang is ${request.headers()['accept-language'] || 'Not defined'} <!>`)
    return next()
  }

}

module.exports = RequestLogger
