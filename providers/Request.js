const ServiceProvider = require('adonis-fold').ServiceProvider // eslint-disable-line
const _ = require('lodash')
const request = require('request')
const halson = require('halson')

class Request {

  constructor(initRequest, Env, Log, Errors, Raven) {
    this.Log = Log
    this.Env = Env
    this.Errors = Errors
    this.Raven = Raven
    this.initRequest = initRequest
  }

  /*
   * @name send
   * @kind function
   *
   * @description
   * A proxy of the actual request. Gets all the papams and puts it together
   *
   * @param {String} url A link to call. Should be pregenerated link but without query params
   * @param {String} [method='GET'] Method to call
   * @param {String} [token] Token to make a call with
   * @param {Object} [body] A body to send with
   * @param {Object} [query] A set of query params to append to url

   * @returns {Response} Gives back a response object containing statusCode, headers, body and halBody when present
   *
   * If request did not pass at all or gave back 400/500 errors, then it will throw a error passing statusCode and a body of erorrs. This error can be reused and sent right to the client
   */

  * send({ url, method, token, body, query }) {
    let response = null
    if (!method) method = 'GET' // eslint-disable-line

    this.Log.info(`${method} to ${url} with body ${JSON.stringify(body || {})} and query ${JSON.stringify(query || {})}`)

    try {
      response = yield this.promisifedRequest({
        url,
        method,
        json: true,
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          Accept: 'application/hal+json,application/json'
        },
        body: (method !== 'GET' && body) ? body : undefined,
        qs: query || undefined
      })
    } catch (err) {
      this.Log.error(`Error while requesting ${url} with body ${JSON.stringify(body || {})} and query ${JSON.stringify(query || {})}`)
      this.Log.error(err)
      this.Raven.captureException(err)
      throw new this.Errors.NoResponse('E_PROVIDER_API_IS_DOWN')
    }

    this.throwErrorIfFailingRequest({ response, url })

     // Filter all the extra stuff from the request obj
    return _.pick(response, ['statusCode', 'body', 'halBody', 'headers'])
  }

  // Original request library wrapped as promise
  promisifedRequest(options) {
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

        if (response.headers && response.headers['content-type'] && response.headers['content-type'].includes('hal+json')) response.halBody = halson(response.body)

        return resolve(response)
      })
    })
  }

  // TODO Make tests
  // Throw error is result is 4xx or 5xx
  throwErrorIfFailingRequest({ response, url }) {
    if (response.statusCode >= 400) {
      this.Log.info(`Failed ${url} with answer ${JSON.stringify(response.body)}`)

      const error = new this.Errors.PassThrough(response.statusCode, Object.assign(response.body, { code: 'E_PROVIDER_FAILED' }))

      // TODO Return more exact error
      this.Raven.captureException(error, { url, response: response.body })
      throw error
    }
  }

}

class RequestProvider extends ServiceProvider {

  * register() {
    this.app.singleton('GoAbout/providers/Request', () => new Request(
        request,
        use('Env'),
        use('Log'),
        use('Errors'),
        use('Raven')
      ))
  }

  static bare() { return Request }

}

module.exports = RequestProvider
