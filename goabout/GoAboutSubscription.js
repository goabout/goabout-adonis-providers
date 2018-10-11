const GoAboutProduct = require('./GoAboutProduct')
const moment = require('moment')

class GoAboutSubscription extends GoAboutProduct {
  constructor(subscription, properties, GoAboutInstance) {
    // Properties which will be passed to users
    super(subscription, GoAboutInstance)

    this.properties = properties
    this.applicableProducts = []
  }

  // TODO add Redis support
  async getApplicableProducts() {
    if (!this.applicableProducts.length) {
      const productsResponse = await this.$GoAbout.request({
        resource: this,
        relation: 'http://rels.goabout.com/applicable-products',
        useSupertoken: true, // To get internal properties of product
        useCache: true
      })

      // TODO Unit test this
      const applicableProductsResources = productsResponse.halBody.getEmbeds('http://rels.goabout.com/product')
      this.applicableProducts = applicableProductsResources.map(productResource => new GoAboutProduct(productResource, this.$GoAbout))
    }

    return this.applicableProducts
  }

  async getApplicableProduct({ productHref, productId }) {
    if (!productHref) productHref = await this.$GoAbout.generateProductHref(productId) //eslint-disable-line

    if (!this.applicableProducts.length) await this.getApplicableProducts()

    let productToReturn = null

    this.applicableProducts.some(product => {
      if (product.getLink('self') === productHref) productToReturn = product
      return productToReturn
    })

    return productToReturn
  }

  async end() {
    const response = await this.$GoAbout.request({
      resource: this,
      relation: 'subscription',
      method: 'PUT',
      body: {
        properties: this.properties,
        validUntil: moment().subtract(5, 'minutes').toISOString()
      }
    })

    return response
  }

  toSanitizedHal() {
    const sanitizedProduct = super.toSanitizedHal()

    if (this.applicableProducts && this.applicableProducts.length) {
      const sanitizedApplicableProducts = this.applicableProducts.map(product => product.toSanitizedHal())
      sanitizedProduct.addEmbed('products', sanitizedApplicableProducts)
    }

    return sanitizedProduct
  }
}

module.exports = GoAboutSubscription
