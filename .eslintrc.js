var path = require('path')

module.exports = {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module'
  },
  env: {
    node: true
  },
  extends: path.join(__dirname, "node_modules/goabout-eslint-config/index.js"),
  plugins: [],
  // add your custom rules here
  'rules': {

  },
  globals: {
    't': false,
    'l': false,
    'config': false,
    'halson': false,
    'fake': false,
  }
}
