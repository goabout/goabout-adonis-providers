const ServiceProvider = require('adonis-fold').ServiceProvider  // eslint-disable-line
const fs = require('fs')

class Info {

  constructor() {
    const infoFile = './.info'
    const packageFile = './package.json'

    if (fs.existsSync(infoFile)) {
      const file = fs.readFileSync(infoFile, 'utf8').split('\n')
      this.branch = file[0]
      this.buildNumber = file[1]
      this.commit = file[2]
      this.pullRequest = file[3]
      this.pullRequestBranch = file[4]
    }

    const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'))
    this.version = packageJson.version

    this.preGeneratedAnswer = {
      status: 'Up',
      version: this.version,
    }

    if (this.pullRequest) this.preGeneratedAnswer.pullRequest = this.pullRequest
    if (this.branch) this.preGeneratedAnswer.branch = this.pullRequestBranch || this.branch
    if (this.commit) this.preGeneratedAnswer.commit = this.commit
    if (this.buildNumber) this.preGeneratedAnswer.buildNumber = this.buildNumber
  }

}

class InfoProvider extends ServiceProvider {

  * register() {
    this.app.singleton('GoAbout/providers/Info', () => new Info())
  }

  static bare() { return Info }

}


module.exports = InfoProvider
