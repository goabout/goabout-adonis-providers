const NE = require('node-exceptions')
const _ = require('lodash')

const codeToLowerCase = code => _.camelCase(code.replace(/^E_/, ''))

class Errors {
  constructor(Antl, Raven, CLS) {
    const that = this

    this.$Antl = Antl
    this.$Raven = Raven
    this.$CLS = CLS

    class General extends NE.LogicalException {
      constructor({ httpCode, message, details, hint, url, params, validationErrors } = {}) {
        if (!message) message = 'E_FATAL_ERROR' //eslint-disable-line
        super(message, httpCode || 500)

        this.details = details || that.localize({ message, params })
        this.hint = hint || that.localize({ message, params, addon: 'hint' })
        this.url = url || that.localize({ message, params, addon: 'url' })
        if (validationErrors) this.validationErrors = validationErrors
      }
    }

    class Crash extends General {
      }

    class BadRequest extends General {
      constructor(args = {}) {
        args.message = args.message || 'E_BAD_REQUEST'
        args.httpCode = args.httpCode || 400
        super(args)
      }
    }

    class NotFound extends General {
      constructor(args = {}) {
        args.message = args.message || 'E_NOT_FOUND'
        args.httpCode = args.httpCode || 404
        super(args)
      }
    }

    class Unauthorized extends General {
      constructor(args = {}) {
        args.message = args.message || 'E_UNAUTHORIZED'
        args.httpCode = args.httpCode || 401
        super(args)
      }
    }

    class Denied extends General {
      constructor(args = {}) {
        args.message = args.message || 'E_ACCESS_DENIED'
        args.httpCode = args.httpCode || 403
        super(args)
      }
    }

    class NoResponse extends General {
      constructor(args = {}) {
        args.message = 'E_NO_RESPONSE_FROM_THE_SIDE_PARTY'
        super(args)
      }
    }

    // Specially for our other Adonis backends like Ovelo
    class PassThrough extends General {
      constructor(args = {}) {
        args.message = args.message || 'E_PROVIDER_FAILED'
        super(args)
      }
    }

    class Validation extends General {
      constructor(errorsArray) {
        super({ httpCode: 422, message: 'E_VALIDATION_FAILED' })
        this.validationErrors = {}

        const arrayToParse = errorsArray.messages ? errorsArray.messages() : errorsArray

        arrayToParse.forEach(error => {
          if (!this.validationErrors[error.field]) this.validationErrors[error.field] = {}
          this.validationErrors[error.field][error.validation] = {
            message: error.message
          }
        })
      }
    }

    this.General = General
    this.Crash = Crash
    this.BadRequest = BadRequest
    this.NotFound = NotFound
    this.Unauthorized = Unauthorized
    this.Denied = Denied
    this.NoResponse = NoResponse
    this.PassThrough = PassThrough
    this.Validation = Validation
  }

  localize({ message, params, addon }) {
    let localized = null
    const defaultLocale = 'en'
    const userLocale = this.$CLS.get('locale')
    const officiallySupportedLocales = ['en', 'nl']

    const codeInLowerCase = codeToLowerCase(message) + (addon ? `.${addon}` : '')

    try {
      localized = this.$Antl.forLocale(userLocale).formatMessage(`errors.${codeInLowerCase}`, params)
    } catch (e) {
      if (officiallySupportedLocales.includes(userLocale) && !addon) {
        this.$Raven.captureException(new NE.LogicalException(`No localization for ${message} (${codeInLowerCase}) in '${userLocale}' language`, 500))
      }

      try {
        localized = this.$Antl.forLocale(defaultLocale).formatMessage(`errors.${codeInLowerCase}`, params)
      } catch (e2) {
        if (!addon) this.$Raven.captureException(new NE.LogicalException(`No localization for ${message} (${codeInLowerCase}) in fallback language '${defaultLocale}'`, 500))
      }
    }


    return localized
  }

}


module.exports = Errors
