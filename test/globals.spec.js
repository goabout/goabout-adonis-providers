/*eslint-disable*/
const sinon = require('sinon')

module.exports = function () {
  this.assert = require('power-assert')
  this.request = require('supertest')
  this.sinon = sinon
  this.result = null
  this.errorResult = null
  this.config = {}
  this.sandbox = sinon.sandbox.create()
  this.fake = require('casual')
  this.l = console.log
}
