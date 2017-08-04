const _ = require('lodash')
const HALResource = require('../utils/HALResource')
const eventTypes = require('./eventTypes')
const GoAboutProduct = require('./GoAboutProduct')

class GoAboutBooking extends HALResource {
  constructor(booking, GoAboutInstance) {
    super(booking)
    this.id = GoAboutInstance.getResourceId({ resource: this })

    this.$GoAbout = GoAboutInstance
    this.$Env = GoAboutInstance.$Env
    this.$Errors = GoAboutInstance.$Errors
    this.$Log = GoAboutInstance.$Log
    this.$Raven = GoAboutInstance.$Raven

    this.$shownProperties = ['name', 'description', 'logoHref', 'properties']
  }

  // TODO Tests
  * setEvent({ eventType, eventData }) {
    const requestResult = yield this.$GoAbout.request({
      resource: this,
      method: 'POST',
      relation: 'http://rels.goabout.com/booking-events',
      body: {
        type: eventTypes[eventType] || eventType,
        data: eventData
      }
    })

    return requestResult
  }

  // TODO Tests
  * getEvents() {
    const eventsResponse = yield this.$GoAbout.request({
      resource: this,
      relation: 'http://rels.goabout.com/booking-events'
    })

    this.events = eventsResponse.halBody.events

    return this.events
  }

  * getProduct() {
    if (!this.product) {
      const productsResponse = yield this.$GoAbout.request({
        resource: this,
        relation: 'http://rels.goabout.com/product'
      })

      this.product = new GoAboutProduct(productsResponse.halBody, this.$GoAbout)
    }

    return this.product
  }


  * getOveloUsageId() {
    if (!this.events) yield this.getEvents()

    const oveloUsageEvent = _.find(this.events, { type: eventTypes.OVELO_ID })
    const oveloUsageId = oveloUsageEvent ? oveloUsageEvent.data : null

      // Throw error if not found
    if (!oveloUsageId) {
      this.$Raven.captureException(new this.$Errors.Raven({ type: 'E_NO_USAGE_ID_FOUND', details: `oveloUsageId event for ${this.getLink('self').href} was not found` }))
      throw new this.$Errors.BadRequest('E_NO_USAGE_ID_FOUND', 'Something went wrong while finishing your booking!')
    }

    return oveloUsageId
  }

  getSanitizedHal() {
    const sanitizedProduct = new HALResource(_.pick(this, this.$shownProperties))

    return sanitizedProduct
  }
}

module.exports = GoAboutBooking
