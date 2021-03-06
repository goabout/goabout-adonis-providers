const _ = require('lodash')
const HALResource = require('../utils/HALResource')

class Request {
  constructor(initRequest, Env, Log, Errors, Raven, Redis) {
    this.$Log = Log
    this.$Env = Env
    this.$Errors = Errors
    this.$Raven = Raven
    this.$initRequest = initRequest
    this.$Redis = Redis || null
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
   * If request did not pass at all or gave back 400/500 errors, then it will throw a error passing statusCode and a body of errors. This error can be reused and sent right to the client
   */

  async send({ url, method, token, body, query, headers, useCache, forceCacheUpdate, errorHandler, doNotReportFailing, includeOriginalErrorResponse, timeout, fullLogging }) {
    let response = null
    if (!method) method = 'GET' // eslint-disable-line

    if (!forceCacheUpdate && useCache && method === 'GET') {
      const dbResult = await this.retrieveFromRedis({ relation: url, token })
      if (dbResult) {
        response = { body: dbResult, halBody: new HALResource(dbResult), headers: {}, statusCode: 200 }
        return response
      }
    }


    const headersToSend = Object.assign({}, headers)
    headersToSend.Accept = 'application/hal+json,application/json'
    if (token) headersToSend.Authorization = `Bearer ${token}`

    const requestOptions = {
      url,
      method,
      json: true,
      headers: headersToSend,
      body: (method !== 'GET' && body) ? body : undefined,
      qs: query || undefined,
      timeout: timeout || 30000,
      fullLogging
    }

    this.$Log.info(`${method} to ${url} with body ${JSON.stringify(body || {})} and query ${JSON.stringify(query || {})}`, { request_url: url, request_method: requestOptions.method, request_query: requestOptions.qs, request_body: requestOptions.body })


    try {
      response = await this.promisifedRequest(requestOptions)
    } catch (err) {
      if (!doNotReportFailing) {
        this.$Log.error(`Error while requesting ${url} with body ${JSON.stringify(body || {})} and query ${JSON.stringify(query || {})}`, { request_url: url, request_method: requestOptions.method, request_query: requestOptions.qs, request_body: requestOptions.body })
        this.$Log.error(err)
        this.$Raven.captureException(err)
      }
      throw new this.$Errors.NoResponse()
    }

    this.throwErrorIfFailingRequest({ response, url, errorHandler, includeOriginalErrorResponse, requestOptions })

    if (useCache || forceCacheUpdate) {
      await this.saveToRedis({
        relation: url,
        token,
        resource: response.body
      })
    }

    // Filter all the extra stuff from the request obj
    return _.pick(response, ['statusCode', 'body', 'halBody', 'headers', 'elapsedTime'])
  }

  // Original request library wrapped as promise
  promisifedRequest(options) {
    return new Promise((resolve, reject) => {
      const isDebug = this.$Env.get('LOGGING', 'error') === 'debug'
      const requestOptions = _.merge({}, options, {
        time: isDebug
      })

      this.$initRequest(requestOptions, (error, response) => {
        if (isDebug && !error) this.$Log.debug(`Request to ${options.url} took ${response ? response.elapsedTime : ''}ms`, { request_url: requestOptions.url, request_method: requestOptions.method, request_query: requestOptions.qs, request_body: requestOptions.body, response_body: options.fullLogging ? response.body : undefined, response_status_code: response.statusCode, response_elapsed_time: response.elapsedTime })

        if (error) {
          return reject(error)
        }

        if (response.headers && response.headers['content-type'] && response.headers['content-type'].includes('hal+json')) response.halBody = new HALResource(response.body)

        return resolve(response)
      })
    })
  }

  // TODO Make tests
  // Throw error is result is 4xx or 5xx
  throwErrorIfFailingRequest({ response, url, errorHandler, includeOriginalErrorResponse, requestOptions }) {
    if (response.statusCode >= 400) {
      this.$Log.info(`Failed ${url} (${response.statusCode}) with answer ${ response.body ? JSON.stringify(response.body).slice(0, 5000) : '<Empty body>'}`, { request_url: url, request_method: requestOptions.method, request_query: requestOptions.qs, request_body: requestOptions.body, response_body: response.body, response_status_code: response.statusCode })

      let error = null
      const { message, details, hint, validationErrors } = errorHandler ? errorHandler(response) : this.defaultErrorHandler(response)

      switch (response.statusCode) {
        case 400:
          error = new this.$Errors.BadRequest({ message, details, hint })
          break
        case 401:
          error = new this.$Errors.Unauthorized({ message, details, hint })
          break
        case 403:
          error = new this.$Errors.Denied({ message, details, hint })
          break
        case 404:
          error = new this.$Errors.NotFound({ message, details, hint })
          break
        default:
          error = new this.$Errors.PassThrough({ httpCode: response.statusCode, message, details, hint, validationErrors })
      }

      error.providerUrl = url
      error.providerResponse = response.body
      if (includeOriginalErrorResponse) error.originalResponse = response

      throw error
    }
  }

  defaultErrorHandler(response) {
    let message = null
    let details = null
    let hint = null
    let validationErrors = null

    if (response && response.body) {
      message = response.body.code ? response.body.code : null
      details = response.body.details ? response.body.details : null
      hint = response.body.hint ? response.body.hint : null
      validationErrors = response.body.validationErrors ? response.body.validationErrors : null
    }

    return { message, details, hint, validationErrors }
  }

  async retrieveFromRedis({ relation, token }) {
    let result = null
    if (!this.$Redis) return result

    const key = this.constructRedisKey({ relation, token })

    const redisBareResult = await this.$Redis.get(key)
    if (!redisBareResult) {
      // this.$Log.info(`No ${relation} found in cache`)
      return result
    }

    try {
      // this.$Log.debug(`${relation} has been found in cache`)
      result = JSON.parse(redisBareResult)
    } catch (e) {
      this.$Log.error('Failed to parse redis result', e, redisBareResult)
      this.$Raven.captureException(e, { input: result })
    }

    return result
  }

  async saveToRedis({ relation, token, resource }) {
    // Pass if no Redis defined
    if (!this.$Redis) return

    try {
      const redisTransaction = this.$Redis.multi()

      const key = this.constructRedisKey({ relation, token })
      redisTransaction.set(key, JSON.stringify(resource))
      redisTransaction.expire(key, this.$Env.get('CACHE_TIME', 300)) // 5 minutes

      await redisTransaction.exec()
      // this.$Log.info(`Relation ${relation} saved to Redis`)
    } catch (err) {
      this.$Log.error(`Failed to save ${relation} to redis`)
      this.$Log.error(err)
      this.$Raven.captureException(err)
    }
  }

  constructRedisKey({ relation, token }) {
    if (!relation) {
      this.$Raven.captureException(new this.$Errors.Crash({ message: 'E_NO_RELATION_FOR_RAVEN' }))
      return null
    }

    return `token:${token || this.token}:relation:${relation}`
  }
}

module.exports = Request
