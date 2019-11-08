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

    // This HALResource is enriched with Routes
    this.$HALResource = GoAboutInstance.$HALResource

    // Left after sanitizing
    this.$shownProperties = ['id', 'name', 'logoHref', 'moreInfoHref', 'description', 'extendedDescription', 'categories', 'supportEmail', 'internalProperties', 'properties', 'validFrom', 'validUntil', 'default']
  }

  // To get product/subscription using supertoken (gives back priceRule etc)
  async getFull() {
    return this.$GoAbout.getProductOrSubscription({ url: this.getLink('self') })
  }

  toSanitizedHal() {
    const sanitizedProduct = new this.$HALResource(_.pick(this, this.$shownProperties))
    if (this.internalProperties) {
      Object.assign(sanitizedProduct, {
        provider: this.internalProperties.provider,
        warning: this.internalProperties.warning || null
      })
    }

    if (this.getLink('self')) sanitizedProduct.addLink(this.isSubscription ? 'original-subscription' : 'original-product', this.getLink('self'))


    if (!this.isSubscription && this.getEmbed('http://rels.goabout.com/product-images')) {
      const productImages = this.getEmbed('http://rels.goabout.com/product-images')


      // Sometimes coconut (accidentially?) sanitizes products twice. This fix should allow sanitizing as many times as possible without loosing images
      if (!productImages.getLinks('items') || !productImages.getLinks('items').length) {
        productImages.addLinks('items', productImages.getLinks('item'))
        productImages.removeLinks('item')
      }

      sanitizedProduct.addEmbed('images', productImages)
    }

    return sanitizedProduct
  }

  toJSON() {
    return _.pick(this, this.$shownProperties)
  }
}

module.exports = GoAboutProduct
