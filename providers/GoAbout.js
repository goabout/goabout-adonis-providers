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
  }

  * getApi({ token }) {
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
      this.Raven.captureException(err)
      throw new this.Errors.NoResponse('E_GOABOUT_API_IS_DOWN')
    }

    return response.halBody
  }

  * getUser({ token }) {
    const api = yield this.getApi({ token })
    return api.getEmbed('http://rels.goabout.com/authenticated-user')
  }

  * getUnfinishedBookings({ token }) {
    const user = yield this.getUser({ token })

    const bookingsResource = yield this.request({
      resource: user,
      method: 'GET',
      relation: 'http://rels.goabout.com/user-bookings',
      query: {
        eventType: 'tFinished', // Temp event until 500s are fixed on GoAbout backend
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
      response = yield this.$request.send({
        url: goaboutUser.links.subscriptions,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
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
    let response = null

    // If no resource provided, then use root of the api
    let resourceToCall = !resource ? yield this.getApi({ token }) : resource
    if (!resourceToCall.getLink) resourceToCall = halson(resourceToCall)

    let requestUrl = resourceToCall.getLink(relation)
    requestUrl = requestUrl ? requestUrl.href : undefined
    if (!requestUrl || !requestUrl.length) throw new this.Errors.BadRequest()

    // Remove all link params
    // TODO Support for link params
    requestUrl = requestUrl.replace(/{\?.*}/g, '')

    this.Log.info(`${method} to ${requestUrl} with params ${JSON.stringify(body) || {}} and query ${JSON.stringify(query) || {}}`)

    try {
      response = yield this.$request.send({
        url: requestUrl,
        method,
        json: true,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/hal+json,application/json'
        },
        body: method !== 'GET' ? body : undefined,
        qs: query || undefined
      })
    } catch (err) {
      this.Log.error(`Error while requesting ${relation} with body ${body}`)
      this.Log.error(err)
      this.Raven.captureException(err)
      throw new this.Errors.NoResponse('E_GOABOUT_API_IS_DOWN')
    }

    // Throw error is result is 4xx or 5xx
    if (['4', '5'].includes(response.statusCode.toString()[0])) {
      this.Log.info(`Failed ${relation} with answer ${JSON.stringify(response.body)}`)

      const error = new this.Errors.PassThrough(response.statusCode, Object.assign(response.body, { code: 'E_GOABOUT_API_FAILED' }))
      this.Raven.captureException(error)
      throw error
    }

    // Filter all the extra stuff from the request obj
    return _.pick(response, ['statusCode', 'body', 'halBody', 'headers'])
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
