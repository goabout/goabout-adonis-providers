const _ = require('lodash')
const HALResource = require('../utils/HALResource')
const eventTypes = require('./eventTypes')

class GoAboutBooking extends HALResource {
  constructor(booking, GoAboutInstance) {
    super(booking)
    this.id = GoAboutInstance.getResourceId({ resource: this })

    this.$GoAbout = GoAboutInstance
    this.$Env = GoAboutInstance.$Env
    this.$Errors = GoAboutInstance.$Errors
    this.$Log = GoAboutInstance.$Log
    this.$Raven = GoAboutInstance.$Raven

    this.$alterableProperties = ['price']
    this.$shownProperties = ['name', 'description', 'logoHref', 'properties']
  }

  async save() {
    await this.$GoAbout.request({
      resource: this,
      method: 'PUT',
      relation: 'self',
      body: _.pick(this, this.$alterableProperties),
      useSupertoken: true
    })

    await this.refresh()
  }

  async refresh() {
    const newBookingResource = await this.$GoAbout.request({
      resource: this,
      method: 'GET',
      relation: 'self',
      forceCacheUpdate: true
    })
    const newBooking = newBookingResource.halBody

    this.id = this.$GoAbout.getResourceId({ resource: newBooking })

    _.forEach(newBooking, (value, key) => {
      if (key !== '_links' && key !== '_embedded') this.key = value
    })

    this.$allBookingKeys = Object.keys(newBooking)
  }

  // TODO Tests
  async setEvent({ eventType, eventData }) {
    const requestResult = await this.$GoAbout.request({
      resource: this,
      method: 'POST',
      relation: 'http://rels.goabout.com/booking-events',
      body: {
        type: eventTypes[eventType] || eventType,
        data: eventData
      }
    })

    // Remove events since these became outdated
    if (this.events) this.events = null

    return requestResult
  }

  // TODO Tests
  async getEvents() {
    const eventsResponse = await this.$GoAbout.request({
      resource: this,
      relation: 'http://rels.goabout.com/booking-events'
    })

    this.events = eventsResponse.halBody.events

    return this.events
  }

  async getEvent({ type, ignoreMissing }) {
    if (!this.events) await this.getEvents()

    const event = _.findLast(this.events, { type: eventTypes[type] || type })
    const eventData = event !== undefined ? event.data : null

      // Throw error if not found
    if (!ignoreMissing && !eventData) {
      const internalError = new this.$Errors.General({ message: 'E_NO_EVENT_FOUND', details: `${type} event for ${this.getLink('self').href} was not found` })
      this.$Raven.captureException(internalError)
      throw new this.$Errors.Crash({ message: 'E_NO_EVENT_FOUND' })
    }

    return eventData
  }

  async getProduct() {
    if (!this.product) {
      this.product = await this.$GoAbout.getProductOrSubscription({ url: this.getLink('http://rels.goabout.com/product').href })
    }

    return this.product
  }

  async getSubscription() {
    const subscriptionHref = await this.getEvent({ type: 'SUBSCRIPTION_HREF' })

    if (!this.subscription) {
      this.subscription = await this.$GoAbout.getProductOrSubscription({
        url: subscriptionHref
      })
    }

    return this.subscription
  }

  toJSON() {
    return _.pick(this, this.$shownProperties)
  }

  toSanitizedHal() {
    return new HALResource(this.toJSON())
  }
}

module.exports = GoAboutBooking
