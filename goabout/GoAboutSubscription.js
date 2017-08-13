const _ = require('lodash')
const GoAboutProduct = require('./GoAboutProduct')

class GoAboutSubscription extends GoAboutProduct {
  constructor(subscription, GoAboutInstance) {
    // Properties which will be passed to users
    super(subscription, GoAboutInstance)

    this.applicableProducts = []
  }

  // TODO add Redis support
  * getApplicableProducts() {
    if (!this.applicableProducts.length) {
      const productsResponse = yield this.$GoAbout.request({
        resource: this,
        relation: 'http://rels.goabout.com/applicable-products',
        useSupertoken: true // To get internal properties of product
      })


      // TODO Unit test this
      const applicableProductsResources = productsResponse.halBody.getEmbeds('http://rels.goabout.com/product')
      this.applicableProducts = applicableProductsResources.map(productResource => new GoAboutProduct(productResource, this.$GoAbout))
    }

    return this.applicableProducts
  }

  * getApplicableProduct({ productHref, productId }) {
    if (!productHref) productHref = yield this.$GoAbout.generateProductHref(productId) //eslint-disable-line

    if (!this.applicableProducts.length) yield this.getApplicableProducts()

    let productToReturn = null

    this.applicableProducts.some(product => {
      if (product.getLink('self').href === productHref) productToReturn = product
      return productToReturn
    })

    return productToReturn
  }

  getSanitizedHal() {
    const sanitizedProduct = super.getSanitizedHal()

    if (this.applicableProducts && this.applicableProducts.length) {
      const sanitizedApplicableProducts = this.applicableProducts.map(product => _.pick(product, this.$shownProperties))
      sanitizedProduct.addEmbed('products', sanitizedApplicableProducts)
    }

    return sanitizedProduct
  }

  // static getUserSubscription
}

module.exports = GoAboutSubscription
