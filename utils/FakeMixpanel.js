
// So no exceptions would be raised if Mixpanel is disabled (tests, develop machines, etc)
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

module.exports = FakeMixpanel
