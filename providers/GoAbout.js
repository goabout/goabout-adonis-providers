const ServiceProvider = require('adonis-fold').ServiceProvider // eslint-disable-line
const _ = require('lodash')
const halson = require('halson')

class GoAbout {

  constructor(request, Env, Errors, Log, Raven) {
    this.$request = request
    this.Env = Env
    this.Errors = Errors
    this.Log = Log
    this.Raven = Raven

    this.FINISHED_EVENT = 'finished'
    this.OVELO_USAGE_ID = 'OveloUsageId'
  }

  * getApi({ token }) {
    const response = yield this.send({
      url: this.Env.get('GOABOUT_API'),
      token
    })

    return response.halBody
  }

  * getUser({ token }) {
    const api = yield this.getApi({ token })
    return api.getEmbed('http://rels.goabout.com/authenticated-user')
  }

  * getBooking({ url, token, withEvents }) {
    const bookingResponse = yield this.send({ url, token })
    const booking = bookingResponse.halBody

    this.Log.debug(`Getting booking ${url}`)

    if (withEvents) {
      const eventsLink = booking.getLink('http://rels.goabout.com/booking-events').href
      const eventsResponse = yield this.send({ url: eventsLink, token })
      booking.events = eventsResponse.halBody.events
    }

    this.Log.debug(`Got booking ${JSON.stringify(booking)}`)


    return booking
  }

  * setEvent({ booking, token, eventType, eventData }) {
    const requestResult = yield this.request({
      resource: booking,
      method: 'POST',
      relation: 'http://rels.goabout.com/booking-events',
      token,
      body: {
        type: eventType,
        data: eventData
      }
    })

    return requestResult
  }

  // Make sure booking is received with events
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

  * getUnfinishedBookings({ token }) {
    const user = yield this.getUser({ token })

    const bookingsResource = yield this.request({
      resource: user,
      method: 'GET',
      relation: 'http://rels.goabout.com/user-bookings',
      query: {
        eventType: this.FINISHED_EVENT, // Temp event until 500s are fixed on GoAbout backend
        eventData: 0
      },
      token
    })

    const embedResources = bookingsResource.halBody.listEmbedRels()
    const bookings = embedResources.includes('item') ? bookingsResource.halBody.getEmbed('item') : []

    this.Log.info(`Got user unfinished bookings ${JSON.stringify(bookings)}`)

    return bookings
  }

  // Deprecated, use getUser instead
  * checkTokenAndReturnUser(token) {
    let response = null

    try {
      response = yield this.$request.send({
        url: this.Env.get('GOABOUT_API'),
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    } catch (err) {
      this.Log.error('Error while requesting GoAbout API')
      throw new this.Errors.Unauthorized()
    }

    const user = response.halBody.getEmbed('http://rels.goabout.com/authenticated-user')

    if (user) {
      const constructedUser = this.constructUser(user)
      this.Log.debug('Received GoAbout user', constructedUser)
      return constructedUser
    }

    this.Log.error('User token wrong or not authorized')
    throw new this.Errors.Unauthorized()
  }

  constructUser(goaboutUser) {
    return {
      email: goaboutUser.email,
      validated: goaboutUser.validated,
      links: {
        self: goaboutUser.getLink('self').href,
        subscriptions: goaboutUser.getLink('http://rels.goabout.com/subscriptions').href,
        bookings: goaboutUser.getLink('http://rels.goabout.com/user-bookings').href
      }
    }
  }

  * getUserSubscriptions(goaboutUser, token) {
    let response = null

    try {
      response = yield this.send({
        url: goaboutUser.links.subscriptions,
        token
      })
    } catch (err) {
      this.Log.error(err)
      throw new this.Errors.Unauthorized()
    }

    const subscriptions = response.halBody.getEmbeds('item') || []
    this.fillSubscriptionsWithIds(subscriptions)

    // this.Log.debug('User has subscriptions')
    // this.Log.debug(JSON.stringify(subscriptions))

    return subscriptions
  }

  fillSubscriptionsWithIds(subscriptions) {
    subscriptions.forEach(subscription => {
      const splitLink = subscription.productHref.split('/')
      subscription.subscriptionId = parseInt(splitLink[splitLink.length - 1], 10)
    })
  }

  * request({ resource, method, relation, body, token, query }) {
    // If no resource provided, then use root of the api
    let resourceToCall = !resource ? yield this.getApi({ token }) : resource
    if (!resourceToCall.getLink) resourceToCall = halson(resourceToCall)

    let requestUrl = resourceToCall.getLink(relation)
    requestUrl = requestUrl ? requestUrl.href : undefined
    if (!requestUrl || !requestUrl.length) throw new this.Errors.BadRequest()

    // Remove all link params
    // TODO Support for link params
    requestUrl = requestUrl.replace(/{\?.*}/g, '')

    const response = yield this.send({
      url: requestUrl,
      method,
      body,
      token,
      query
    })

    // Filter all the extra stuff from the request obj
    return _.pick(response, ['statusCode', 'body', 'halBody', 'headers'])
  }

  // Internal method, try to avoid using unless necessary
  * send({ url, method, token, body, query }) {
    let response = null
    if (!method) method = 'GET' // eslint-disable-line

    this.Log.info(`${method} to ${url} with body ${JSON.stringify(body || {})} and query ${JSON.stringify(query || {})}`)

    try {
      response = yield this.$request.send({
        url,
        method,
        json: true,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/hal+json,application/json'
        },
        body: (method !== 'GET' && body) ? body : undefined,
        qs: query || undefined
      })
    } catch (err) {
      this.Log.error(`Error while requesting ${url} with body ${JSON.stringify(body || {})} and query ${JSON.stringify(query || {})}`)
      this.Log.error(err)
      this.Raven.captureException(err)
      throw new this.Errors.NoResponse('E_GOABOUT_API_IS_DOWN')
    }

    this.throwErrorIfFailingRequest({ response, url })

    return response
  }

  // Throw error is result is 4xx or 5xx
  throwErrorIfFailingRequest({ response, url }) {
    if (['4', '5'].includes(response.statusCode.toString()[0])) {
      this.Log.info(`Failed ${url} with answer ${JSON.stringify(response.body)}`)

      const error = new this.Errors.PassThrough(response.statusCode, Object.assign(response.body, { code: 'E_GOABOUT_API_FAILED' }))
      this.Raven.captureException(error)
      throw error
    }
  }

  generateBookingRequest({ token, params, productId }) {
    return {
      method: 'POST',
      token,
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

class GoAboutProvider extends ServiceProvider {

  * register() {
    this.app.singleton('GoAbout/providers/GoAboutApi', () => new GoAbout(
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
