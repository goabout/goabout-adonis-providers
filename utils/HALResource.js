/*
  Based on https://github.com/seznam/halson
  However, the code was refactored into ES6 class so it can be used as a base for other Classes without any harm
 */


class HALResource {
  constructor(data) {
    if (data instanceof HALResource) {
      Object.assign(this, data)
      return
    }

    if (typeof data === 'string') {
      Object.assign(this, JSON.parse(data))
    } else {
      Object.assign(this, data)
    }

    if (this._embedded && (typeof this._embedded === 'object')) {
      const _embedded = {}

      Object.keys(this._embedded).forEach(key => {
        if (this._embedded[key]) {
          if (Array.isArray(this._embedded[key])) {
            _embedded[key] = [].concat(this._embedded[key]).map(embed => new HALResource(embed))
          } else {
            _embedded[key] = new HALResource(this._embedded[key])
          }
        }
      })

      this._embedded = _embedded
    }
  }

  _invert(filterCallback) {
    return function () {
      return !filterCallback.apply(null, arguments) //eslint-disable-line
    }
  }

  listLinkRels() {
    return this._links ? Object.keys(this._links) : []
  }

  listEmbedRels() {
    return this._embedded ? Object.keys(this._embedded) : []
  }

  getLinks(rel, filterCallback, begin, end) {
    if (!this._links || !(rel in this._links)) {
      return []
    }

    let links = [].concat(this._links[rel])

    if (filterCallback) {
      links = links.filter(filterCallback)
    }

    return links.slice(begin || 0, end || links.length)
  }

  getLink(rel, filterCallback, def) {
    if (typeof filterCallback !== 'function') {
      def = filterCallback
      filterCallback = null
    }
    return this.getLinks(rel, filterCallback, 0, 1)[0] || def
  }

  getEmbeds(rel, filterCallback, begin, end) {
    if (!this._embedded || !(rel in this._embedded)) {
      return []
    }

    let items = [].concat(this._embedded[rel])

    if (filterCallback) {
      items = items.filter(filterCallback)
    }

    return items.slice(begin || 0, end || items.length)
  }

  getEmbed(rel, filterCallback, def) {
    if (typeof filterCallback !== 'function') {
      def = filterCallback
      filterCallback = null
    }
    return this.getEmbeds(rel, filterCallback, 0, 1)[0] || def
  }

  addLink(rel, link) {
    if (typeof link === 'string') {
      link = { href: link }
    }

    if (!this._links) {
      this._links = {}
    }

    if (!(rel in this._links)) {
          // single link
      this._links[rel] = link
    } else {
          // multiple links
      this._links[rel] = [].concat(this._links[rel])
      this._links[rel].push(link)
    }

    return this
  }

  addEmbed(rel, embed) {
    return this.insertEmbed(rel, -1, embed)
  }

  insertEmbed(rel, index, embed) {
    if (!this._embedded) {
      this._embedded = {}
    }

    if (!(rel in this._embedded)) {
      this._embedded[rel] = Array.isArray(embed) ? embed.map(r => new HALResource(r)) : new HALResource(embed)
      return this
    }

    const items = [].concat(embed).map(r => new HALResource(r))

    this._embedded[rel] = [].concat(this._embedded[rel])

    if (index < 0) {
      Array.prototype.push.apply(this._embedded[rel], items)
    } else {
      const params = [index, 0].concat(items)
      Array.prototype.splice.apply(this._embedded[rel], params)
    }

    return this
  }

  removeLinks(rel, filterCallback) {
    if (!this._links || !(rel in this._links)) {
      return
    }

    if (!filterCallback) {
      delete (this._links[rel])
    } else {
      this._links[rel] = [].concat(this._links[rel]).filter(this._invert(filterCallback))
    }

    return this
  }

  removeEmbeds(rel, filterCallback) {
    if (!this._embedded || !(rel in this._embedded)) {
      return
    }

    if (!filterCallback) {
      return delete (this._embedded[rel])
    }

    this._embedded[rel] = [].concat(this._embedded[rel]).filter(this._invert(filterCallback))

    return this
  }

}

module.exports = HALResource
