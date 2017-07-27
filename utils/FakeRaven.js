class FakeRaven {
  constructor() {
    // Construct an object which silently blocks all the calls
    ['captureException', 'context', 'setContext', 'captureBreadcrumb'].forEach(name => {
      this[name] = () => {}
    })
  }
}

module.exports = FakeRaven
