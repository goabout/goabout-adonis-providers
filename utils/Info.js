const fs = require('fs')
const moment = require('moment')

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
      this.buildTime = file[5]

      if (this.buildTime && moment(this.buildTime).isValid()) this.buildTime = moment.utc(this.buildTime).format('YYYY-MM-DDTHH:mm:ssZ')
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
    if (this.buildTime) this.preGeneratedAnswer.buildTime = this.buildTime

    this.preGeneratedAnswer.startTime = moment.utc().format('YYYY-MM-DDTHH:mm:ssZ')
  }

}

module.exports = Info
