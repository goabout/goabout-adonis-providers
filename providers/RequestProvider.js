const ServiceProvider = require('adonis-fold').ServiceProvider // eslint-disable-line
const Request = require('../request/Request')

class RequestProvider extends ServiceProvider {

  * register() {
    this.app.singleton('GoAbout/providers/Request', () => new Request(
        request,
        use('Env'),
        use('Log'),
        use('Errors'),
        use('Raven')
      ))
  }

}

module.exports = RequestProvider