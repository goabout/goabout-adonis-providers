const ServiceProvider = require('adonis-fold').ServiceProvider // eslint-disable-line
const _ = require('lodash')
const halson = require('halson')

class GoAbout {

  constructor(Request, Env, Errors, Log, Raven, Redis) {
    this.Request = Request
    this.Env = Env
    this.Errors = Errors
    this.Log = Log
    this.Raven = Raven
    this.Redis = Redis || null

    // GoAbout subclasses
    this.Booking = GoAboutBooking //eslint-disable-line

    // Class variables
    this.token = null
    this.user = null

    this.internal = {
      bookings: [],
      subscriptions: null,
      root: null
    }
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
      this.Raven.captureException(new this.Errors.Raven({ type: 'E_MISSING_RELATION', relation }))
      throw new this.Errors.BadRequest()
    }

    // TODO Support for link params, currently just removes all link params :-(
    requestUrl = requestUrl.replace(/{\?.*}/g, '')

    return yield this.Request.send({
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
    if (!this.internal.root) this.internal.root = yield this.retrieveFromRedis({ relation: 'root' })

    if (!this.internal.root) {
      const response = yield this.Request.send({
        url: this.Env.get('GOABOUT_API'),
        token: this.token
      })
      this.internal.root = response.halBody

      yield this.saveToRedis({
        relation: 'root',
        resource: this.internal.root
      })
    }

    return this.internal.root
  }

  * getUser() {
    const api = yield this.getRoot()
    this.user = api.getEmbed('http://rels.goabout.com/authenticated-user')
    return this.user
  }


  * getUserSubscriptions() {
    if (!this.internal.subscriptions) {
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

      this.internal.subscriptions = subscriptions
    }

    // this.Log.info('User has subscriptions')
    // this.Log.info(JSON.stringify(subscriptions))

    return this.internal.subscriptions
  }

  * getUserSubscription({ subscriptionId, subscriptionHref }) {
    if (!subscriptionHref && !subscriptionId) throw new this.Errors.BadRequest('E_NO_SUBSCRIPTION_ID')

    if (!subscriptionHref) {
      const root = yield this.getRoot()
      //eslint-disable-next-line
      subscriptionHref = `${root.getLink('self').href}product/${subscriptionId}`
    }

    // Try getting it from
    if (this.activeSubscription) {
      this.activeSubscription = yield this.retrieveFromRedis({ relation: subscriptionHref })
    }

    if (!this.activeSubscription) {
      const userSubscriptions = yield this.getUserSubscriptions()

      userSubscriptions.some(subscription => {
        if (subscription.properties.getLink('self').href === subscriptionHref) this.activeSubscription = subscription
        return this.activeSubscription
      })

      if (!this.activeSubscription) {
        this.Log.error(`User ${this.user.email} does not have subscription ${subscriptionHref}`)
        throw new this.Errors.Denied('E_SUBSCRIPTION_IS_MISSING', 'You do not have this subscription')
      }

      yield this.activeSubscription.getApplicableProducts()
      this.activeSubscription = this.activeSubscription.toSanitizedHal()
    }


    return this.activeSubscription
  }

  * getBooking({ url, withEvents }) {
    if (!this.internal.bookings[url]) {
      const bookingResponse = yield this.Request.send({ url, token: this.token })

      //eslint-disable-next-line
      const booking = new GoAboutBooking(bookingResponse.halBody, this)

      this.Log.info(`Getting booking ${url}`)

      if (withEvents) {
        yield booking.getEvents()
      }

      this.Log.info(`Got booking ${JSON.stringify(booking)}`)

      this.internal.bookings[url] = booking
    }

    return this.internal.bookings[url]
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

      this.Log.info(`Got user unfinished bookings ${JSON.stringify(this.unfinishedBookings)}`)
    }

    return this.unfinishedBookings
  }

  * retrieveFromRedis({ relation }) {
    let result = null
    if (!this.Redis) return result

    const key = this.constructRedisKey({ relation })

    const redisBareResult = yield this.Redis.get(key)
    if (!redisBareResult) {
      this.Log.info(`No ${relation} found in cache`)
      return result
    }

    try {
      this.Log.info(`${relation} has been found in cache`)
      result = JSON.parse(redisBareResult)
      result = halson(result)
    } catch (e) {
      this.Log.error('Failed to parse redis result', e, redisBareResult)
      this.Raven.captureException(e, { input: result })
    }

    return result
  }

  * saveToRedis({ relation, resource }) {
    // Pass if no Redis defined
    if (!this.Redis) return

    try {
      const redisTransaction = this.Redis.multi()

      const key = this.constructRedisKey({ relation })
      redisTransaction.set(key, JSON.stringify(resource))
      redisTransaction.expire(key, this.Env.get('CACHE_TIME', 300)) // 5 minutes

      yield redisTransaction.exec()
      this.Log.info(`Relation ${relation} saved to Redis`)
    } catch (err) {
      this.Log.error(err)
      this.Raven.captureException(err)
    }
  }

  constructRedisKey({ relation }) {
    if (!relation) {
      this.Raven.captureException(new this.Errors.Raven({ type: 'E_NO_RELATION_FOR_RAVEN' }))
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
      this.Raven.captureException(new this.Errors.Raven({ type: 'E_NO_USAGE_ID_FOUND', details: `oveloUsageId event for ${bookingHref} was not found` }))
      throw new this.Errors.BadRequest('E_NO_USAGE_ID_FOUND', 'Something went wrong while finishing your booking!')
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

}

class GoAboutBooking {
  constructor(booking, GoAboutInstance) {
    this.GoAbout = GoAboutInstance
    this.Env = GoAbout.Env
    this.Errors = GoAbout.Errors
    this.Log = GoAbout.Log
    this.Raven = GoAbout.Raven

    this.eventTypes = {
      FINISHED: 'finished',
      OVELO_USAGE_ID: 'OveloUsageId'
    }

    this.properties = booking
  }

  // TODO Tests
  * setEvent({ eventType, eventData }) {
    const requestResult = yield this.GoAbout.request({
      resource: this.properties,
      method: 'POST',
      relation: 'http://rels.goabout.com/booking-events',
      body: {
        type: this.eventTypes[eventType] || eventType,
        data: eventData
      }
    })

    return requestResult
  }

  // TODO Tests
  * getEvents() {
    if (!this.events) {
      const eventsResponse = yield this.GoAbout.request({
        resource: this.properties,
        relation: 'http://rels.goabout.com/booking-events'
      })
      this.events = eventsResponse.halBody.events
    }

    return this.events
  }
}

class GoAboutProduct {
  constructor(product, GoAboutInstance) {
    const halProduct = halson(product)
    Object.assign(this, halProduct)

    this.$GoAbout = GoAboutInstance
    this.$Env = GoAbout.Env
    this.$Errors = GoAbout.Errors
    this.$Log = GoAbout.Log
    this.$Raven = GoAbout.Raven

    this.$sanitizedProperties = ['name', 'logoHref', 'moreInfoHref', 'description', 'categories', 'supportEmail']
  }

  toSanitizedHal() {
    const sanitizedProduct = halson(_.pick(this.properties, this.allowedProperties))

    return sanitizedProduct
  }
}

class GoAboutSubscription extends GoAboutProduct {
  constructor(subscription, GoAboutInstance) {
    // Properties which will be passed to users
    super(subscription, GoAboutInstance)

    this.applicableProducts = null
  }

  * getApplicableProducts() {
    if (!this.applicableProducts) {
      const productsResponse = yield this.GoAbout.request({
        resource: this.properties,
        relation: 'http://rels.goabout.com/applicable-products'
      })

      this.applicableProducts = productsResponse.halBody.getEmbeds('http://rels.goabout.com/product')
    }

    return this.applicableProducts
  }

  * getProduct({ productHref, productId }) {
    // Should get product from the list
  }

  toSanitizedHal() {
    const sanitizedProduct = super.toSanitizedHal()

    if (this.applicableProducts && this.applicableProducts.length) {
      const sanitizedApplicableProducts = this.applicableProducts.map(product => _.pick(product, this.allowedProperties))
      sanitizedProduct.addEmbed('products', sanitizedApplicableProducts)
    }

    return sanitizedProduct
  }

  static getUserSubscription
}

class GoAboutProvider extends ServiceProvider {

  * register() {
    this.app.bind('GoAbout/providers/GoAboutApi', () => {
      const Env = use('Env')
      const isRedisActivated = !!Env.get('REDIS_PORT')

      return new GoAbout(
        use('GoAbout/providers/Request'),
        use('Env'),
        use('Errors'),
        use('Log'),
        use('Raven'),
        isRedisActivated ? use('Redis') : null
      )
    })
  }

  static bare() { return GoAbout }

}


module.exports = GoAboutProvider
