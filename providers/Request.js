/*
 Same request.js but promisifed in a way that it can be easily mocked in tests.

 Use as:
 var options = {
 url: 'https://api.github.com/repos/request/request',
 headers: {
 'User-Agent': 'request'
 }
 };

 request(options)
 .then( => {

 })
 .catch(() => {

 })

 Or just yield it!

 See https://github.com/request/request#requestoptions-callback for options
 */

const ServiceProvider = require('adonis-fold').ServiceProvider // eslint-disable-line
const _ = require('lodash')
const request = require('request')
const halson = require('halson')

class Request {

  constructor(initRequest, Env, Log) {
    this.Log = Log
    this.Env = Env
    this.initRequest = initRequest
  }

  send(options) {
    return new Promise((resolve, reject) => {
      const isDebug = this.Env.get('LOGGING', 'error') === 'debug'
      const requestOptions = _.merge({}, options, {
        time: isDebug
      })

      this.initRequest(requestOptions, (error, response) => {
        if (isDebug) this.Log.debug(`Request to ${options.url} took ${response ? response.elapsedTime : ''}ms`)

        if (error) {
          return reject(error)
        }

        if (response.headers && response.headers['content-type'].includes('hal+json')) response.halBody = halson(response.body)

        return resolve(response)
      })
    })
  }
}

class RequestProvider extends ServiceProvider {

  * register() {
    this.app.singleton('GoAbout/providers/Request', () => new Request(
        request,
        use('Env'),
        use('Log')
      ))
  }

  static bare() { return Request }

}

module.exports = RequestProvider
