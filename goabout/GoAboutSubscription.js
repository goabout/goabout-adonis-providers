const _ = require('lodash')
const GoAboutProduct = require('./GoAboutProduct')

class GoAboutSubscription extends GoAboutProduct {
  constructor(subscription, GoAboutInstance) {
    // Properties which will be passed to users
    super(subscription, GoAboutInstance)

    this.applicableProducts = null
  }

  * getApplicableProducts() {
    if (!this.applicableProducts) {
      const productsResponse = yield this.GoAbout.request({
        resource: this.properties,
        relation: 'http://rels.goabout.com/applicable-products'
      })

      this.applicableProducts = productsResponse.halBody.getEmbeds('http://rels.goabout.com/product')
    }

    return this.applicableProducts
  }

  * getProduct({ productHref, productId }) {
    // Should get product from the list
  }

  toSanitizedHal() {
    const sanitizedProduct = super.toSanitizedHal()

    if (this.applicableProducts && this.applicableProducts.length) {
      const sanitizedApplicableProducts = this.applicableProducts.map(product => _.pick(product, this.allowedProperties))
      sanitizedProduct.addEmbed('products', sanitizedApplicableProducts)
    }

    return sanitizedProduct
  }

  // static getUserSubscription
}

module.exports = GoAboutSubscription
