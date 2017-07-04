# GoAbout Adonis Provider

This is a bunch of providers (aka extensions) used by all adonis-based apps in GoAbout

It includes:
* GoAbout API connector
* Promisified Request library
* Raven
* Mixpanel
* Utils such as forEach for generator functions

### Requirements
* [NodeJS 7.4.0, NPM & Yarn](https://nodejs.org/download/)
* [Gulp](http://gulpjs.com/)

### Installation for development:

* Open terminal and proceed to app folder
* Make sure you have nodejs & gulp globally installed
* Run `yarn install`
* Run `gulp autotest`
* Enjoy!

The setup itself does not have any http servers up so use testing instead ;-)

### Testing

Run `gulp test` to test once.

Run `gulp autotest` and save any file. Tests will rerun each time you modify any file.

### Custom DB & other things

By default, all the development machines use automatically created docker databases (if there would be any)


Make sure the providers use `node_modules` of the project where providers are used. It is important because providers themselves are not complete without an actual app (see gitter [discussion](https://gitter.im/adonisjs/adonis-framework?at=581634ba5a1cfa016e628dd4)). Hint: Only install adonis-based dependencies as devDependencies in the `goabout-adonis-providers` so it will use project dependencies once added.
