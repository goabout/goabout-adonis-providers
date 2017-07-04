const ServiceProvider = require('adonis-fold').ServiceProvider // eslint-disable-line

class GoAbout {

  constructor(request, Env, Errors, Log) {
    this.request = request
    this.Env = Env
    this.Errors = Errors
    this.Log = Log
  }

  * checkTokenAndReturnUser(token) {
    let response = null

    try {
      response = yield this.request.send({
        url: this.Env.get('GOABOUT_API'),
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    } catch (err) {
      this.Log.error('Error while requesting GoAbout API')
      throw new this.Errors.Unauthorized()
    }

    const user = response.halBody.getEmbed('http://rels.goabout.com/authenticated-user')

    if (user) {
      const constructedUser = this.constructUser(user)
      this.Log.debug('Received GoAbout user', constructedUser)
      return constructedUser
    }

    this.Log.error('User token wrong or not authorized')
    throw new this.Errors.Unauthorized()
  }

  constructUser(goaboutUser) {
    return {
      email: goaboutUser.email,
      validated: goaboutUser.validated,
      links: {
        self: goaboutUser.getLink('self').href,
        subscriptions: goaboutUser.getLink('http://rels.goabout.com/subscriptions').href,
        bookings: goaboutUser.getLink('http://rels.goabout.com/user-bookings').href
      }
    }
  }

  * getUserSubscriptions(goaboutUser, token) {
    let response = null

    try {
      response = yield this.request.send({
        url: goaboutUser.links.subscriptions,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    } catch (err) {
      this.Log.error(err)
      throw new this.Errors.Unauthorized()
    }

    const subscriptions = response.halBody.getEmbeds('item') || []
    this.fillSubscriptionsWithIds(subscriptions)

    // this.Log.debug('User has subscriptions')
    // this.Log.debug(JSON.stringify(subscriptions))

    return subscriptions
  }

  fillSubscriptionsWithIds(subscriptions) {
    subscriptions.forEach(subscription => {
      const splitLink = subscription.productHref.split('/')
      subscription.subscriptionId = parseInt(splitLink[splitLink.length - 1], 10)
    })
  }

}

class GoAboutProvider extends ServiceProvider {

  * register() {
    this.app.singleton('GoAbout/providers/GoAboutApi', () => new GoAbout(
        use('GoAbout/providers/Request'),
        use('Env'),
        use('Errors'),
        use('Log')
      ))
  }

  static bare() { return GoAbout }

}


module.exports = GoAboutProvider
