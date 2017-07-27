const _ = require('lodash')
const halson = require('halson')

class GoAboutProduct {
  constructor(product, GoAboutInstance) {
    const halProduct = halson(product)
    Object.assign(this, halProduct)

    this.$GoAbout = GoAboutInstance
    this.$Env = GoAboutInstance.Env
    this.$Errors = GoAboutInstance.Errors
    this.$Log = GoAboutInstance.Log
    this.$Raven = GoAboutInstance.Raven

    this.$sanitizedProperties = ['name', 'logoHref', 'moreInfoHref', 'description', 'categories', 'supportEmail']
  }

  toSanitizedHal() {
    const sanitizedProduct = halson(_.pick(this.properties, this.allowedProperties))

    return sanitizedProduct
  }
}

module.exports = GoAboutProduct
