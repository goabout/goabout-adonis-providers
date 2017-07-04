/*eslint-disable*/
const sinon = require('sinon')

module.exports = function () {
  this._ = require('lodash')
  this.chai = require('chai')
  this.chai.use(require('chai-generator'))
  this.expect = chai.expect
  this.assert = chai.assert
  this.request = require('supertest')
  this.sinon = sinon
  // require('sinon-as-promised')(Promise)
  this.Promise = Promise
  this.result = null
  this.errorResult = null
  this.config = {}
  this.v = {}
  this.sandbox = sinon.sandbox.create()
  this.moment = require('moment')
  this.co = require('co')
  this.halson = require('halson')
}
