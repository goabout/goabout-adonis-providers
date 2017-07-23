const ServiceProvider = require('adonis-fold').ServiceProvider // eslint-disable-line
const _ = require('lodash')
const halson = require('halson')

class GoAbout {

  constructor(Request, Env, Errors, Log, Raven) {
    this.Request = Request
    this.Env = Env
    this.Errors = Errors
    this.Log = Log
    this.Raven = Raven

    // GoAbout subclasses
    this.Booking = GoAboutBooking //eslint-disable-line

    // Class variables
    this.token = null
    this.bookings = {}
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
    let resourceToCall = !resource ? yield this.getApi() : resource
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

  * getApi() {
    if (!this.api) {
      const response = yield this.Request.send({
        url: this.Env.get('GOABOUT_API'),
        token: this.token
      })
      this.api = response.halBody
    }

    return this.api
  }

  * getUser() {
    const api = yield this.getApi()
    return api.getEmbed('http://rels.goabout.com/authenticated-user')
  }

  * getUserSubscriptions() {
    if (!this.subscriptions) {
      let response = null

      const user = yield this.getUser()

      response = yield this.request({
        resource: user,
        relation: 'http://rels.goabout.com/subscriptions'
      })

      this.subscriptions = response.halBody.getEmbeds('item') || []
      this.fillSubscriptionsWithIds(this.subscriptions)
    }

    // this.Log.debug('User has subscriptions')
    // this.Log.debug(JSON.stringify(subscriptions))

    return this.subscriptions
  }

  * getBooking({ url, withEvents }) {
    if (!this.bookings[url]) {
      const bookingResponse = yield this.Request.send({ url, token: this.token })

      //eslint-disable-next-line
      const booking = new GoAboutBooking(bookingResponse.halBody, this)

      this.Log.debug(`Getting booking ${url}`)

      if (withEvents) {
        yield booking.getEvents()
      }

      this.Log.debug(`Got booking ${JSON.stringify(booking)}`)

      this.bookings[url] = booking
    }

    return this.bookings[url]
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

  fillSubscriptionsWithIds(subscriptions) {
    subscriptions.forEach(subscription => {
      const splitLink = subscription.productHref.split('/')
      subscription.subscriptionId = parseInt(splitLink[splitLink.length - 1], 10)
    })
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
      const eventsResponse = this.GoAbout.request({
        resource: this.properties,
        relation: 'http://rels.goabout.com/booking-events'
      })
      this.events = eventsResponse.halBody.events
    }

    return this.events
  }
}

class GoAboutProvider extends ServiceProvider {

  * register() {
    this.app.bind('GoAbout/providers/GoAboutApi', () =>
      new GoAbout(
        use('GoAbout/providers/Request'),
        use('Env'),
        use('Errors'),
        use('Log'),
        use('Raven')
      ))
  }

  static bare() { return GoAbout }

}


module.exports = GoAboutProvider
