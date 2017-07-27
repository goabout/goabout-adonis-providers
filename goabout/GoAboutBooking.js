class GoAboutBooking {
  constructor(booking, GoAboutInstance) {
    this.$GoAbout = GoAboutInstance
    this.$Env = GoAboutInstance.Env
    this.$Errors = GoAboutInstance.Errors
    this.$Log = GoAboutInstance.Log
    this.$Raven = GoAboutInstance.Raven

    this.eventTypes = {
      FINISHED: 'finished',
      OVELO_USAGE_ID: 'OveloUsageId'
    }

    this.properties = booking
  }

  // TODO Tests
  * setEvent({ eventType, eventData }) {
    const requestResult = yield this.$GoAbout.request({
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
      const eventsResponse = yield this.$GoAbout.request({
        resource: this.properties,
        relation: 'http://rels.goabout.com/booking-events'
      })
      this.events = eventsResponse.halBody.events
    }

    return this.events
  }
}

module.exports = GoAboutBooking
