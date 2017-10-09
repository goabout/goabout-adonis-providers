const NE = require('node-exceptions')
const _ = require('lodash')

const codeToLowerCase = code => _.camelCase(code.replace(/^E_/, ''))


/*
  All the errors except "GENERAL" are deprecated :P
 */

class Crash extends NE.LogicalException {
  constructor(errorCode, details) {
    super(errorCode, 500)
    this.details = details
  }
}

class BadRequest extends NE.LogicalException {
  constructor(errorCode, details) {
    super(errorCode, 400)
    this.details = details || 'Bad request'
    // TODO Add "action", e. g. a hint to the user of how he can solve the issue
  }
}

class NotFound extends NE.LogicalException {
  constructor(details) {
    super('E_NOT_FOUND', 404)
    this.details = details || 'Not found'
  }
}

class Unauthorized extends NE.LogicalException {
  constructor(details) {
    super('E_UNAUTHORIZED', 401)
    this.details = details || 'Invalid access token'
  }
}

// TODO Stop using error code as 1st arqument
class Denied extends NE.LogicalException {
  constructor(errorCode, details) {
    super(errorCode || 'E_ACCESS_DENIED', 403)
    this.details = details || 'You don\'t have rights for this action'
  }
}

class Validation extends NE.LogicalException {
  constructor(errorsArray) {
    super('E_VALIDATION_FAILED', 422)
    this.details = 'One or more attributes are incorrect'
    this.validationErrors = {}

    // Fill validation errors
    errorsArray.forEach(error => {
      if (!this.validationErrors[error.field]) this.validationErrors[error.field] = {}
      this.validationErrors[error.field][error.validation] = {
        message: error.message
      }
    })
  }
}

class PassThrough extends NE.LogicalException {
  constructor(status, body) {
    super((body && body.code) ? body.code : 'E_UNKNOWN_ERROR', status || 500)
    this.details = (body && body.message) ? body.message : undefined // Because GoAbout sends details as "Message"
    Object.assign(this, _.omit(body || {}, ['message']))
  }
}

class Raven extends NE.LogicalException {
  constructor(data) {
    super(data.type || 'E_INTERNAL_ERROR', 500)
    Object.assign(this, _.omit(data, ['type']))
  }
}

class NoResponse extends NE.LogicalException {
  constructor(errorCode, details) {
    super(errorCode || 'NO_RESPONSE_FROM_SIDE_PARTY', 500)
    this.details = details
  }
}

class General extends NE.LogicalException {
  constructor({ httpCode, code, details, hint }) {
    super(code || 'E_UNKNOWN_ERROR', httpCode || 500)
    this.details = details
    this.hint = hint
  }
}

class Localized extends General {
  constructor({ httpCode, code, params, antl }) {
    const codeInLowerCase = codeToLowerCase(code)
    let details = null
    let hint = null

    try {
      details = antl.formatMessage(`errors.${codeInLowerCase}`, params)
    } catch (e) {
      try {
        details = antl.forLocale('en').formatMessage(`errors.${codeInLowerCase}`, params)
      } catch (e2) {
        // Do nothing
      }
    }

    try {
      hint = antl.formatMessage(`errors.${codeInLowerCase}.hint`, params)
    } catch (e) {
      try {
        hint = antl.forLocale('en').formatMessage(`errors.${codeInLowerCase}.hint`, params)
      } catch (e2) {
            // Do nothing
      }
    }

    super({ code, httpCode, details, hint })
  }
}


class Errors {
  constructor() {
    this.BadRequest = BadRequest
    this.Validation = Validation
    this.NotFound = NotFound
    this.Unauthorized = Unauthorized
    this.Denied = Denied
    this.PassThrough = PassThrough
    this.NoResponse = NoResponse
    this.Raven = Raven
    this.Crash = Crash
    this.General = General
    this.Localized = Localized
  }

}


module.exports = Errors
