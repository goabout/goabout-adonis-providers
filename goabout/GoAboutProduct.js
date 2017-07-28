const _ = require('lodash')
const HALResource = require('../utils/HALResource')

class GoAboutProduct extends HALResource {
  constructor(product, GoAboutInstance) {
    super(product)

    this.$GoAbout = GoAboutInstance
    this.$Env = GoAboutInstance.$Env
    this.$Errors = GoAboutInstance.$Errors
    this.$Log = GoAboutInstance.$Log
    this.$Raven = GoAboutInstance.$Raven

    // Left after sanitizing
    this.$shownProperties = ['name', 'logoHref', 'moreInfoHref', 'description', 'categories', 'supportEmail']
  }

  getSanitizedHal() {
    const sanitizedProduct = new HALResource(_.pick(this, this.$shownProperties))

    return sanitizedProduct
  }
}

module.exports = GoAboutProduct
