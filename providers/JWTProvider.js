const { ServiceProvider } = require('@adonisjs/fold')  // eslint-disable-line
const VerifyJWTToken = require('../utils/VerifyJWTTokenMiddleware')

class JWTProvider extends ServiceProvider {

  register() {
    this.app.bind('GoAbout/Middleware/VerifyJWTToken', () => new VerifyJWTToken(
      use('Log'),
      use('Errors'),
      use('Env'),
      use('Request')
    ))
  }

}


module.exports = JWTProvider
