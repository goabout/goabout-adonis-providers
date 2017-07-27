const _ = require('lodash')
const coEach = require('co-each')

class Utils {
  constructor(Log) {
    this.Log = Log
    this.forEachGeneratorParallel = coEach
  }

  * forEachGeneratorSync(array, cb) {
    if (_.isArray(array)) {
      for (let i = 0; i < array.length; ++i) {
        yield cb(array[i], i)
      }
    } else if (_.isObject(array)) {
      const keys = Object.keys(array)
      for (let i = 0; i < keys.length; ++i) {
        yield cb(array[keys[i]], keys[i])
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