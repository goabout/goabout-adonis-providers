const _ = require('lodash')
const HALResource = require('../utils/HALResource')

class GoAboutProduct extends HALResource {
  constructor(product, GoAboutInstance) {
    super(product)

    // TODO Unit test this
    this.id = GoAboutInstance.getResourceId({ resource: this })

    this.$GoAbout = GoAboutInstance
    this.$Env = GoAboutInstance.$Env
    this.$Errors = GoAboutInstance.$Errors
    this.$Log = GoAboutInstance.$Log
    this.$Raven = GoAboutInstance.$Raven

    // Left after sanitizing
    this.$shownProperties = ['id', 'name', 'logoHref', 'moreInfoHref', 'description', 'categories', 'supportEmail', 'internalProperties']
  }

  getSanitizedHal() {
    const sanitizedProduct = new HALResource(_.pick(this, this.$shownProperties))
    sanitizedProduct.provider = this.internalProperties.provider

    return sanitizedProduct
  }
}

module.exports = GoAboutProduct
