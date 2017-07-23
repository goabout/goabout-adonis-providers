/*eslint-disable*/
const sinon = require('sinon')

module.exports = function () {
  this._ = require('lodash')
  this.assert = require('power-assert')
  this.request = require('supertest')
  this.sinon = sinon
  // require('sinon-as-promised')(Promise)
  this.result = null
  this.errorResult = null
  this.config = {}
  this.t = {}
  this.sandbox = sinon.sandbox.create()
  this.moment = require('moment')
  this.co = require('co')
  this.halson = require('halson')
  this.fake = require('casual')
  this.l = console.log
}
