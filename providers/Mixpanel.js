const ServiceProvider = require('adonis-fold').ServiceProvider  // eslint-disable-line
const Mixpanel = require('mixpanel')

class FakeMixpanel {
  constructor() {
    // Construct a class which silently blocks all the calls
    ['track', 'alias', 'init', 'import', 'import_batch'].forEach(name => {
      this[name] = () => {}
    })

    this.people = {}

    const peopleMethods = ['set', 'set_once', 'increment', 'append', 'union', 'track_charge', 'clear_charges', 'delete_user']
    peopleMethods.forEach(name => {
      this.people[name] = () => {}
    })
  }
}

class MixpanelProvider extends ServiceProvider {

  * register() {
    this.app.singleton('GoAbout/providers/Mixpanel', () => {
      const Env = use('Env')
      const Log = use('Log')
      const mixpanelToken = Env.get('MIXPANEL', null)
      let mixpanelInstance = null

      if (mixpanelToken) {
        mixpanelInstance = Mixpanel.init(mixpanelToken, {
          protocol: 'https'
        })
      } else {
        mixpanelInstance = new FakeMixpanel()
      }

      mixpanelInstance.status = () => {
        if (mixpanelToken) Log.info('Mixpanel is active')
        if (!mixpanelToken) Log.info('Mixpanel is disabled')
        if (Env.get('NODE_ENV') === 'production' && !mixpanelToken) Log.error('Mixpanel not active on production!')
      }


      return mixpanelInstance
    })
  }

  static bare() { return FakeMixpanel }

}


module.exports = MixpanelProvider
