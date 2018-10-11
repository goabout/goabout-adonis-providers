const { ServiceProvider } = require('@adonisjs/fold')  // eslint-disable-line
const HALResourceWithRoutes = require('../utils/HALResourceWithRoutes')
const AttachHALResourceMiddleware = require('../utils/AttachHALResourceMiddleware')


class HALResourceWithRoutesProvider extends ServiceProvider {

  register() {
    const providers = {
      Config: use('Config'),
      CLS: use('GoAbout/providers/ContinuationLocalStorage'),
      Errors: use('GoAbout/providers/Errors')
    }

    class $HALResourceWithRoutes extends HALResourceWithRoutes {
      constructor(data) {
        super(data, providers)
      }
    }

    this.app.singleton('GoAbout/providers/HALResourceWithRoutes', () => $HALResourceWithRoutes)

    this.app.bind('GoAbout/Middleware/AttachHALResource', () => new AttachHALResourceMiddleware({
      CLS: use('GoAbout/providers/ContinuationLocalStorage'),
      HALResource: use('GoAbout/providers/HALResourceWithRoutes')
    }))
  }

  static bare() { return HALResourceWithRoutes }

}


module.exports = HALResourceWithRoutesProvider
