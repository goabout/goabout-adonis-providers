const GoAboutProduct = require('./GoAboutProduct')

class GoAboutSubscription extends GoAboutProduct {
  constructor(subscription, GoAboutInstance) {
    // Properties which will be passed to users
    super(subscription, GoAboutInstance)

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
      if (product.getLink('self').href === productHref) productToReturn = product
      return productToReturn
    })

    return productToReturn
  }

  toSanitizedHal() {
    const sanitizedProduct = super.toSanitizedHal()

    if (this.applicableProducts && this.applicableProducts.length) {
      const sanitizedApplicableProducts = this.applicableProducts.map(product => product.toSanitizedHal())
      sanitizedProduct.addEmbed('products', sanitizedApplicableProducts)
    }

    return sanitizedProduct
  }

  // static getUserSubscription
}

module.exports = GoAboutSubscription
