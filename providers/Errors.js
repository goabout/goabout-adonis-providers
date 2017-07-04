const ServiceProvider = require('adonis-fold').ServiceProvider // eslint-disable-line
const NE = require('node-exceptions')

class BadRequest extends NE.LogicalException {
  constructor(errorCode, details) {
    super(errorCode, 400)
    this.details = details
    // TODO Add "action", e. g. a hint to the user of how he can solve the issue
  }
}

class NotFound extends NE.LogicalException {
  constructor(details) {
    super('E_NOT_FOUND', 404)
    this.details = details
  }
}

class Unauthorized extends NE.LogicalException {
  constructor(details) {
    super('E_UNAUTHORIZED', 401)
    this.details = details || 'Invalid access token'
  }
}

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

const errors = {
  BadRequest,
  Validation,
  NotFound,
  Unauthorized,
  Denied
}


class ErrorsProvider extends ServiceProvider {

  * register() {
    this.app.singleton('GoAbout/providers/Errors', () => errors)
  }

  static bare() { return errors }

}


module.exports = ErrorsProvider
