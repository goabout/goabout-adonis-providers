const _ = require('lodash')
const moment = require('moment')

const GoAboutBooking = require('./GoAboutBooking')
const GoAboutProduct = require('./GoAboutProduct')
const GoAboutSubscription = require('./GoAboutSubscription')
const eventTypes = require('./eventTypes')

class GoAbout {
  constructor(providers) {
    // Injected values
    Object.keys(providers).forEach(key => { this[`$${key}`] = providers[key] })

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

    this.eventTypes = eventTypes
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
  * @param {HALResource} [resource] A resource to call. If not present, goAbout api will be used
  * @param {String} relation A relation to use
  * @param {String} [method='GET'] Method to call
  * @param {String} [token] Token to make a call with (you can set it for instance and then it will be passed automatically)
  * @param {Object} [body] A body to send with
  * @param {Object} [query] A set of query params to append to url

  * @returns {Response} Gives back a response object containing statusCode, headers, body and halBody when present
  *
  * If request did not pass at all or gave back 400/500 errors, then it will throw a error passing statusCode and a body of errors. This error can be reused and sent right to the client
  */
  async request({ resource, relation, method, body, query, token, useSupertoken, useCache, forceCacheUpdate }) {
    let response = null

    // If no resource provided, then use root of the api
    let resourceToCall = !resource ? await this.getRoot({ useSupertoken }) : resource
    if (!resourceToCall.getLink) resourceToCall = new this.$HALResource(resourceToCall)

    let requestUrl = resourceToCall.getLink(relation)
    requestUrl = requestUrl || undefined
    if (!requestUrl || !requestUrl.length) {
      this.$Raven.captureException(new this.$Errors.Crash({ message: 'E_MISSING_RELATION', details: relation }))
      throw new this.$Errors.BadRequest()
    }

    // TODO Support for link params, currently just removes all link params :-(
    requestUrl = requestUrl.replace(/{\?.*}/g, '')
    const requestToken = useSupertoken ? await this.$Auth0.getToken() : (token || this.token)

    const config = {
      url: requestUrl,
      method,
      body,
      query,
      token: requestToken,
      useCache,
      forceCacheUpdate,
      errorHandler: this.errorHandler
    }

    response = await this.$Request.send(config)

    return response
  }

  // Because GoAbout gives errors in different format.
  // Attention! This error handler is only triggered automatically if requests are made via this.request
  errorHandler(response) {
    let details = null
    const message = null

    if (response && response.body && response.body.message) details = response.body.message

    return { message, details }
  }

  /*
    More specific methods, based on request and Request.send
  */

  async getRoot({ forceCacheUpdate = false, useSupertoken } = {}) {
    const token = useSupertoken ? await this.$Auth0.getToken() : this.token

    const response = await this.$Request.send({
      url: this.$Env.get('GOABOUT_API'),
      token,
      useCache: true,
      forceCacheUpdate
    })

    return response.halBody
  }

  // If no url, getting self
  async getUser({ url, fresh } = {}) {
    if (!url) return this.getSelfUser({ fresh })

    const supertoken = await this.$Auth0.getToken()
    const userResponse = await this.$Request.send({ url, token: supertoken, useCache: false })

    if (!userResponse.halBody) throw new this.$Errors.Crash('E_FAILED_TO_GET_USER')

    this.$Log.info(`Got user ${url}`)
    return userResponse.halBody
  }

  async getSelfUser({ fresh }) {
    const api = await this.getRoot()
    const embeddedUser = api.getEmbed('http://rels.goabout.com/authenticated-user')

    this.user = (fresh && embeddedUser && embeddedUser.getLink('self')) ? await this.getUser({ url: embeddedUser.getLink('self'), fresh }) : embeddedUser

    if (this.user) {
      this.user.id = this.getResourceId({ resource: this.user })
      if (api.getLink('http://rels.goabout.com/agencies')) this.user.superuser = true
    }


    return this.user
  }

  async getUserProperties({ requestedProperties } = {}) {
    if (this.$userProperties) return this.$userProperties

    const user = await this.getUser()
    const userWithSupertokenRes = await await this.request({
      resource: user,
      relation: 'self',
      useSupertoken: true,
      useCache: false
    })

    const userWithSupertoken = userWithSupertokenRes.halBody
    const userProperties = Object.assign({}, userWithSupertoken.properties)

    // So all user props would be in the same place
    if (userWithSupertoken.email) userProperties.email = userWithSupertoken.email
    if (userWithSupertoken.name) userProperties.name = userWithSupertoken.name
    if (userWithSupertoken.phonenumber) userProperties.phonenumber = userWithSupertoken.phonenumber

    // Filter out not requested props
    if (requestedProperties && requestedProperties.length) {
      const keptProperties = [...requestedProperties, 'email', 'phonenumber', 'name']
      Object.keys(userProperties).forEach(key => {
        if (!keptProperties.includes(key)) delete userProperties[key]
      })
    }

    return userProperties
  }

  async setUserProperties({ properties } = {}) {
    const user = await this.getUser()
    const currentProperties = await this.getUserProperties()

    const propsToSave = Object.assign({}, currentProperties, properties)
    const requestBody = { properties: propsToSave }

    delete propsToSave.email

    // Because email, phonenumber & name are saved in separate fields
    if (properties.phonenumber !== undefined) {
      requestBody.phonenumber = propsToSave.phonenumber
      delete propsToSave.phonenumber
    }

    if (propsToSave.firstName && propsToSave.lastName) {
      requestBody.name = `${propsToSave.firstName} ${propsToSave.lastName}`
      delete propsToSave.name
    } else if (properties.name !== undefined) {
      requestBody.name = propsToSave.name
      delete propsToSave.name
    }

    await this.request({
      resource: user,
      relation: 'self',
      method: 'PUT',
      body: requestBody,
      useSupertoken: true
    })

    // Reset cached user props
    this.$userProperties = undefined

    return true
  }

  async getUserSubscriptions() {
    if (!this.$subscriptions) {
      let response = null

      const user = await this.getUser()

      response = await this.request({
        resource: user,
        relation: 'http://rels.goabout.com/subscriptions',
        useSupertoken: true // To get internal properties of product
      })

      const subscriptionResources = response.halBody.getEmbeds('item') || []
      const subscriptions = []

      subscriptionResources.forEach(resource => {
        const subscription = resource.getEmbed('http://rels.goabout.com/product')
        if (subscription && subscription.isSubscription) {
          subscription.addLink('subscription', resource.getLink('self'))
          subscription.validFrom = resource.validFrom
          subscription.validUntil = resource.validUntil
          subscriptions.push(new GoAboutSubscription(subscription, resource.properties, this))
        }
      })

      this.$subscriptions = subscriptions
    }

    return this.$subscriptions
  }

  // TODO Add redis support
  async getUserSubscription({ subscriptionId, subscriptionHref }) {
    if (!subscriptionHref) subscriptionHref = await this.generateProductHref(subscriptionId) // eslint-disable-line
    if (!this.activeSubscription) {
      const userSubscriptions = await this.getUserSubscriptions()

      userSubscriptions.some(subscription => {
        if (subscription.getLink('self') === subscriptionHref) this.activeSubscription = subscription
        return this.activeSubscription
      })
    }

    return this.activeSubscription
  }

  // Not dependent on user
  async getProductOrSubscription({ id, url }) {
    if (!url) url = await this.generateProductHref(id) // eslint-disable-line
    const token = await this.$Auth0.getToken()
    const productResponse = await this.$Request.send({ url, token, useCache: true })
    const product = productResponse.halBody.isSubscription ? new GoAboutSubscription(productResponse.halBody, {}, this) : new GoAboutProduct(productResponse.halBody, this)

    this.$Log.info(`Got product/subscription ${url}`)

    return product
  }

  async createBooking({ product, subscription, productProperties, userProperties, onlyCheck }) {
    let booking = null
    let bookingResponse = null

    try {
      bookingResponse = await this.request({
        method: 'POST',
        relation: onlyCheck ? 'http://rels.goabout.com/order-info' : 'http://rels.goabout.com/order-checkout',
        body: {
          products: [{
            productHref: product.getLink('self'),
            properties: productProperties
          }],
          userProperties
        }
      })
    } catch (e) {
      if (e.details && e.details.match('validation failed for product')) {
        throw new this.$Errors.Validation([])
      } else {
        throw e
      }
    }

    if (onlyCheck) {
      booking = bookingResponse.body.products[0]
    } else {
      const bookingResource = bookingResponse.halBody.getEmbed('http://rels.goabout.com/booking')
      booking = new this.Booking(bookingResource, this)

      const events = [
        booking.setEvent({
          eventType: 'SUBSCRIPTION_HREF',
          eventData: subscription.getLink('self')
        }),
        booking.setEvent({
          eventType: 'FINISHED',
          eventData: false
        }),
        booking.setEvent({
          eventType: 'INVOICED',
          eventData: false
        }),
        booking.setEvent({
          eventType: 'CREATED_AT',
          eventData: moment().format('YYYY-MM-DDTHH:mm:ssZ')
        })
      ]

      if (this.$Env.get('CREATE_SPECIMEN_USAGES') === 'true') {
        events.push(booking.setEvent({
          eventType: 'specimen',
          eventData: true
        }))
      }

      await Promise.all(events)
    }

    return booking
  }

  async getBooking({ url }) {
    const bookingResponse = await this.$Request.send({ url, token: this.token, useCache: true })

    // eslint-disable-next-line
    const booking = new GoAboutBooking(bookingResponse.halBody, this)

    this.$Log.info(`Got booking ${url}`)

    return booking
  }

  // TODO Tests
  async getUnfinishedBookings() {
    if (!this.unfinishedBookings) {
      const user = await this.getUser()

      const bookingsResource = await this.request({
        resource: user,
        method: 'GET',
        relation: 'http://rels.goabout.com/user-bookings',
        query: {
          eventType: eventTypes.FINISHED, // Temp event until 500s are fixed on GoAbout backend
          eventData: false
        }
      })

      const embedResources = bookingsResource.halBody.listEmbedRels()
      let bareBookings = embedResources.includes('item') ? bookingsResource.halBody.getEmbeds('item') : []

      if (_.isObject(bareBookings) && !_.isArray(bareBookings)) bareBookings = [bareBookings]

      // eslint-disable-next-line
      this.unfinishedBookings = bareBookings.length ? bareBookings.map(bareBooking => new GoAboutBooking(bareBooking, this)) : bareBookings
    }

    return this.unfinishedBookings
  }

  userValidation() {
    return {
      name: 'min:2',
      phonenumber: 'min:4',
      email: 'required|email'
    }
  }

  // Deprecated method, used only when goabout booking is made to send userProperties
  async fillWithUserPropsAndValidate({ userProperties }) {
    if (!this.user) await this.getUser()

    userProperties.email = this.user.email
    if (!userProperties.name) userProperties.name = (userProperties.firstName && userProperties.lastName) ? `${userProperties.firstName} ${userProperties.lastName}` : this.user.name
    if (!userProperties.phonenumber) userProperties.phonenumber = this.user.phonenumber

    const validation = await this.$Validator.validateAll(userProperties, this.userValidation())
    if (validation.fails()) throw new this.$Errors.Validation(validation.messages())
  }

  async sendFeedback({ email, text, subject, name }) {
    return this.request({
      relation: 'http://rels.goabout.com/feedback',
      method: 'POST',
      body: { email, text, subject, name }
    })
  }

  // Or product-subscription href
  async generateProductHref(productId) {
    if (!productId || (_.isString(productId) && !productId.length)) throw new this.$Errors.BadRequest({ message: 'E_NO_SUBSCRIPTION_OR_PRODUCT_ID' })

    const root = await this.getRoot()
    return `${root.getLink('self')}product/${productId}`
  }

  // TODO TEST
  async generateProductBookingHref({ productBookingId }) {
    if (!productBookingId || (_.isString(productBookingId) && !productBookingId.length)) throw new this.$Errors.BadRequest('E_NO_PRODUCT_BOOKING_ID')

    const root = await this.getRoot()
    return `${root.getLink('self')}product-booking/${productBookingId}`
  }

  // TODO Make test
  getResourceId({ resource }) {
    const link = resource.getLink('self')
    const linkInParts = link.split('/')
    const id = linkInParts[linkInParts.length - 1]
    return id
  }
}

module.exports = GoAbout
