const _ = require('lodash')

class Utils {
  constructor(Log) {
    this.Log = Log
  }

  async asyncInSequence(arr, fn) {
    if (_.isArray(arr)) {
      // eslint-disable-next-line
      for (const [index, element] of arr.entries()) {
        // eslint-disable-next-line
        await fn(element, index)
      }
    } else if (_.isObject(arr)) {
      const keys = Object.keys(arr)

      // eslint-disable-next-line
      for (const key of keys) {
        const element = arr[key]
        // eslint-disable-next-line
        await fn(element, key)
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
