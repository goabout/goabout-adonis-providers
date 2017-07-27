const _ = require('lodash')
const halson = require('halson')

const GoAboutBooking = require('./GoAboutBooking')
const GoAboutProduct = require('./GoAboutProduct')
const GoAboutSubscription = require('./GoAboutSubscription')

class GoAbout {

  constructor($Request, $Env, $Errors, $Log, $Raven, $Redis) {
    // Injected values
    this.$Request = $Request
    this.$Env = $Env
    this.$Errors = $Errors
    this.$Log = $Log
    this.$Raven = $Raven
    this.$Redis = $Redis || null

    // GoAbout subclasses
    this.Booking = GoAboutBooking
    this.Subscription = GoAboutSubscription
    this.Product = GoAboutProduct

    // Variables
    this.token = null
    this.user = null

    // Internal
    this.$bookings = []
    this.$subscriptions = null
    this.$root = null
  }

  /*
    Basic methods
  */

 /*
  * @name request
  * @kind function
  *
  * @description
  * Extracts exact link from the resource using passed hal relation and passes the request stuff to the 'send' function
  *
  * @param {Halson object} [resource] A resource to call. If not present, goAbout api will be used
  * @param {String} relation A relation to use
  * @param {String} [method='GET'] Method to call
  * @param {String} [token] Token to make a call with (you can set it for instance and then it will be passed automatically)
  * @param {Object} [body] A body to send with
  * @param {Object} [query] A set of query params to append to url

  * @returns {Response} Gives back a response object containing statusCode, headers, body and halBody when present
  *
  * If request did not pass at all or gave back 400/500 errors, then it will throw a error passing statusCode and a body of erorrs. This error can be reused and sent right to the client
  */
  * request({ resource, relation, method, body, query, token }) {
    // If no resource provided, then use root of the api
    let resourceToCall = !resource ? yield this.getRoot() : resource
    if (!resourceToCall.getLink) resourceToCall = halson(resourceToCall)

    let requestUrl = resourceToCall.getLink(relation)
    requestUrl = requestUrl ? requestUrl.href : undefined
    if (!requestUrl || !requestUrl.length) {
      this.$Raven.captureException(new this.$Errors.Raven({ type: 'E_MISSING_RELATION', relation }))
      throw new this.$Errors.BadRequest()
    }

    // TODO Support for link params, currently just removes all link params :-(
    requestUrl = requestUrl.replace(/{\?.*}/g, '')

    return yield this.$Request.send({
      url: requestUrl,
      method,
      body,
      query,
      token: token || this.token
    })
  }

  /*
    More specific methods, based on request and Request.send
  */

  * getRoot() {
    if (!this.$root) this.$root = yield this.retrieveFromRedis({ relation: 'root' })

    if (!this.$root) {
      const response = yield this.$Request.send({
        url: this.$Env.get('GOABOUT_API'),
        token: this.token
      })
      this.$root = response.halBody

      yield this.saveToRedis({
        relation: 'root',
        resource: this.$root
      })
    }

    return this.$root
  }

  * getUser() {
    const api = yield this.getRoot()
    this.user = api.getEmbed('http://rels.goabout.com/authenticated-user')
    return this.user
  }

  * getUserSubscriptions() {
    if (!this.$subscriptions) {
      let response = null

      const user = yield this.getUser()

      response = yield this.request({
        resource: user,
        relation: 'http://rels.goabout.com/subscriptions'
      })

      const subscriptionResources = response.halBody.getEmbeds('item') || []
      const subscriptions = []

      subscriptionResources.forEach(resource => {
        const subscription = resource.getEmbed('http://rels.goabout.com/product')
        if (subscription.isSubscription) subscriptions.push(new GoAboutSubscription(subscription, this)) //eslint-disable-line
      })

      this.$subscriptions = subscriptions
    }

    return this.$subscriptions
  }

  * getUserSubscription({ subscriptionId, subscriptionHref }) {
    if (!subscriptionHref && !subscriptionId) throw new this.$Errors.BadRequest('E_NO_SUBSCRIPTION_ID')
    if (!subscriptionHref) subscriptionHref = yield this.generateProductHref(subscriptionId) // eslint-disable-line

    // Try getting it from Redis
    if (!this.activeSubscription) {
      this.$Log
      this.activeSubscription = yield this.retrieveFromRedis({ relation: subscriptionHref })
    }

    if (!this.activeSubscription) {
      const userSubscriptions = yield this.getUserSubscriptions()

      userSubscriptions.some(subscription => {
        if (subscription.properties.getLink('self').href === subscriptionHref) this.activeSubscription = subscription
        return this.activeSubscription
      })

      if (!this.activeSubscription) {
        this.$Log.error(`User ${this.user.email} does not have subscription ${subscriptionHref}`)
        throw new this.$Errors.Denied('E_SUBSCRIPTION_IS_MISSING', 'You do not have this subscription')
      }

      yield this.activeSubscription.getApplicableProducts()
      this.activeSubscription = this.activeSubscription.toSanitizedHal()
    }


    return this.activeSubscription
  }

  * getBooking({ url, withEvents }) {
    if (!this.$bookings[url]) {
      const bookingResponse = yield this.$Request.send({ url, token: this.token })

      //eslint-disable-next-line
      const booking = new GoAboutBooking(bookingResponse.halBody, this)

      this.$Log.info(`Getting booking ${url}`)

      if (withEvents) {
        yield booking.getEvents()
      }

      this.$Log.info(`Got booking ${JSON.stringify(booking)}`)

      this.$bookings[url] = booking
    }

    return this.$bookings[url]
  }

  // TODO Tests
  * getUnfinishedBookings() {
    if (!this.unfinishedBookings) {
      const user = yield this.getUser()

      const bookingsResource = yield this.request({
        resource: user,
        method: 'GET',
        relation: 'http://rels.goabout.com/user-bookings',
        query: {
          eventType: this.FINISHED_EVENT, // Temp event until 500s are fixed on GoAbout backend
          eventData: 0
        }
      })

      const embedResources = bookingsResource.halBody.listEmbedRels()
      const bareBookings = embedResources.includes('item') ? bookingsResource.halBody.getEmbed('item') : []

      // eslint-disable-next-line
      this.unfinishedBookings = bareBookings.map(bareBooking => new GoAboutBooking(bareBooking, this))

      this.$Log.info(`Got user unfinished bookings ${JSON.stringify(this.unfinishedBookings)}`)
    }

    return this.unfinishedBookings
  }

  * retrieveFromRedis({ relation }) {
    let result = null
    if (!this.$Redis) return result

    const key = this.constructRedisKey({ relation })

    const redisBareResult = yield this.$Redis.get(key)
    if (!redisBareResult) {
      this.$Log.info(`No ${relation} found in cache`)
      return result
    }

    try {
      this.$Log.info(`${relation} has been found in cache`)
      result = JSON.parse(redisBareResult)
      result = halson(result)
    } catch (e) {
      this.$Log.error('Failed to parse redis result', e, redisBareResult)
      this.$Raven.captureException(e, { input: result })
    }

    return result
  }

  * saveToRedis({ relation, resource }) {
    // Pass if no Redis defined
    if (!this.$Redis) return

    try {
      const redisTransaction = this.$Redis.multi()

      const key = this.constructRedisKey({ relation })
      redisTransaction.set(key, JSON.stringify(resource))
      redisTransaction.expire(key, this.$Env.get('CACHE_TIME', 300)) // 5 minutes

      yield redisTransaction.exec()
      this.$Log.info(`Relation ${relation} saved to Redis`)
    } catch (err) {
      this.$Log.error(err)
      this.$Raven.captureException(err)
    }
  }

  constructRedisKey({ relation }) {
    if (!relation) {
      this.$Raven.captureException(new this.$Errors.Raven({ type: 'E_NO_RELATION_FOR_RAVEN' }))
      return null
    }

    return `token:${this.token}:relation:${relation}`
  }

  /*
    Helper methods
  */

  getOveloUsageId({ booking, bookingHref }) {
    const oveloUsageEvent = _.find(booking.events, { type: 'oveloUsageId' })
    const oveloUsageId = oveloUsageEvent ? oveloUsageEvent.data : null

    // Throw error if not found
    if (!oveloUsageId) {
      this.$Raven.captureException(new this.$Errors.Raven({ type: 'E_NO_USAGE_ID_FOUND', details: `oveloUsageId event for ${bookingHref} was not found` }))
      throw new this.$Errors.BadRequest('E_NO_USAGE_ID_FOUND', 'Something went wrong while finishing your booking!')
    }

    return oveloUsageId
  }

  generateBookingRequest({ params, productId }) {
    return {
      method: 'POST',
      body: {
        products: [{
          productHref: `https://api.goabout.com/product/${productId}`,
          properties: {}
        }],
        userProperties: {
          email: params.email,
          phonenumber: params.phoneNumber, // not the small 'n' in 'number'
          name: params.name,
        }
      }
    }
  }

  // Or product-subscription href
  * generateProductHref(productId) {
    const root = yield this.getRoot()
    return `${root.getLink('self').href}product/${productId}`
  }
}

module.exports = GoAbout
