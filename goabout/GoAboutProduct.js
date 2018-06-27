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
    this.$shownProperties = ['id', 'name', 'logoHref', 'moreInfoHref', 'description', 'extendedDescription', 'categories', 'supportEmail', 'internalProperties', 'properties']
  }

  // To get product/subscription using supertoken (gives back priceRule etc)
  async getFull() {
    return this.$GoAbout.getProductOrSubscription({ url: this.getLink('self').href })
  }

  toSanitizedHal() {
    const sanitizedProduct = new HALResource(_.pick(this, this.$shownProperties))
    if (this.internalProperties) sanitizedProduct.provider = this.internalProperties.provider

    if (this.getLink('self')) sanitizedProduct.addLink(this.isSubscription ? 'original-subscription' : 'original-product', this.getLink('self').href)
    if (!this.isSubscription && this.getEmbed('http://rels.goabout.com/product-images')) sanitizedProduct.addEmbed('images', this.getEmbed('http://rels.goabout.com/product-images'))

    return sanitizedProduct
  }

  toJSON() {
    return _.pick(this, this.$shownProperties)
  }
}

module.exports = GoAboutProduct
