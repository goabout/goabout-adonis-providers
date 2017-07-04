

const gulp = require('gulp')
const gulpsync = require('gulp-sync')(gulp)
const gulpLoadPlugins = require('gulp-load-plugins')

const plugins = gulpLoadPlugins()
const _ = require('lodash')

const config = {
  SOURCE: 'app/',
  TEMP: 'tmp/',

  SOURCE_FILES: [
    'providers/**/*.js',
    '.env'
  ],

  SERVER: 'server.js',

  SPEC_FILES: [
    'test/bootstrap.spec.js',
    'test/providers/*'
  ]
}

plugins.swallowError = function (error) {
  console.log(error.toString()) //eslint-disable-line
  this.emit('end')
}

gulp.task('default', ['test'])

/*
  Test tasks

  Use 'gulp test' or just 'gulp autotest' to run unit tests
*/

gulp.task('test', gulpsync.sync(['test:mocha']))

gulp.task('autotest', gulpsync.sync(['test:mocha:ignoreErrors']), () => {
  gulp.watch(_.union(config.SPEC_FILES, config.SOURCE_FILES), ['test:mocha:ignoreErrors'])
})

// Internal tasks
const mochaConfig = {
  reporter: 'spec',
  timeout: 3000,
  require: ['co-mocha']
}

gulp.task('test:mocha', () => gulp.src(config.SPEC_FILES, { read: false })
    .pipe(plugins.mocha(mochaConfig)))

gulp.task('test:mocha:ignoreErrors', () => gulp.src(config.SPEC_FILES, { read: false })
    .pipe(plugins.mocha(mochaConfig))
    .on('error', plugins.swallowError))
