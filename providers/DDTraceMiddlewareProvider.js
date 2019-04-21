const { ServiceProvider } = require('@adonisjs/fold') // eslint-disable-line
const DDTraceMiddleware = require('../utils/DDTraceMiddleware')

class DDTraceMiddlewareProvider extends ServiceProvider {

  register() {
    this.app.bind('GoAbout/Middleware/DDTraceMiddleware', () => new DDTraceMiddleware({
      CLS: use('CLS'),
      Route: use('Route')
    }))
  }

  static bare() { return DDTraceMiddleware }

}

module.exports = DDTraceMiddlewareProvider
