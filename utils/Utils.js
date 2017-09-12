const _ = require('lodash')

class Utils {
  constructor(Log) {
    this.Log = Log
  }

  // Might not work anymore. Didn't test, it's deprecated code anyway
  async forEachGeneratorSync(array, cb) {
    if (_.isArray(array)) {
      for (let i = 0; i < array.length; ++i) {
        await cb(array[i], i) //eslint-disable-line
      }
    } else if (_.isObject(array)) {
      const keys = Object.keys(array)
      for (let i = 0; i < keys.length; ++i) {
        await cb(array[keys[i]], keys[i])  //eslint-disable-line
      }
    }
  }

  outputSpawnResult(result) {
    if (result.stderr && result.stderr.toString().length) {
      this.Log.error(result.stderr.toString())
    }

    if (result.stdout && result.stdout.toString().length) {
      this.Log.info(result.stdout.toString())
    }
  }

}

module.exports = Utils
