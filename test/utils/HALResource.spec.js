const assert = require('assert')
const HALResource = require('../../utils/HALResource')

const example = {
  _links: {
    self: {
      href: '/hajovsky',
    },
    avatar: {
      href: 'https://avatars0.githubusercontent.com/u/113901?s=460',
      type: 'image/jpeg'
    },
    related: [{
      href: 'http://hajovsky.sk',
      name: 'homepage'
    }, {
      href: 'https://twitter.com/hajovsky',
      name: 'twitter'
    }]
  },
  title: 'Juraj Hájovský',
  username: 'hajovsky',
  emails: [
    'juraj.hajovsky@example.com',
    'hajovsky@example.com'
  ],
  stats: {
    starred: 3,
    followers: 0,
    following: 0

  },
  joined: '2009-08-10T00:00:00.000Z',
  _embedded: {
    starred: [
      {
        _links: {
          self: {
            href: '/joyent/node'
          },
          related: {
            href: 'http://nodejs.org/',
            title: 'nodejs.org',
            name: 'website'
          },
          author: {
            href: '/joyent',
            title: 'Joyent'
          }
        },
        title: 'joyent / node',
        description: 'evented I/O for v8 javascript',
        stats: {
          watched: 2092,
          starred: 28426,
          forked: 5962
        }
      },
      {
        _links: {
          self: {
            href: '/koajs/koa'
          },
          related: {
            href: 'http://koajs.com',
            title: 'koajs.com',
            name: 'website'
          },
          author: {
            href: '/koajs',
            title: 'koajs'
          }
        },
        title: 'koajs / koa',
        description: 'Expressive middleware for node.js using generators',
        stats: {
          watched: 238,
          starred: 3193,
          forked: 180
        }
      },
      {
        _links: {
          self: {
            href: '/pgte/nock'
          },
          author: {
            href: '/pgte',
            title: 'Pedro Teixeira'
          }
        },
        title: 'pgte / nock',
        description: 'HTTP mocking and expectations library',
        stats: {
          watched: 22,
          starred: 803,
          forked: 77
        }
      }
    ]
  }
}

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

describe('HALResource', () => {
  describe('factory', () => {
    it('create without data', () => {
      const res = new HALResource()
      const expected = {}

      assert(res instanceof HALResource)
      assert.deepEqual(res, expected)
    })

    it('create with object', () => {
      const res = new HALResource(clone(example))
      const expected = clone(example)
      assert.deepEqual(res, expected)
    })

    it('create with serialized object', () => {
      const res = new HALResource(JSON.stringify(clone(example)))
      const expected = clone(example)
      assert.deepEqual(res, expected)
    })

    it('prevent double conversion', () => {
      const data = { title: 'Untitled' }
      const res1 = new HALResource(data)
      const res2 = new HALResource(res1)
      assert.deepEqual(res1, res2)
    })
  })

  describe('listLinkRels()', () => {
    it('return empty list', () => {
      const res = new HALResource().listLinkRels()
      const expected = []
      assert.deepEqual(res, expected)
    })

    it('return existing rels', () => {
      const res = new HALResource(clone(example)).listLinkRels()
      const expected = ['self', 'avatar', 'related']
      assert.deepEqual(res, expected)
    })
  })

  describe('listEmbedRels()', () => {
    it('return empty list', () => {
      const res = new HALResource().listEmbedRels()
      const expected = []
      assert.deepEqual(res, expected)
    })

    it('return existing rels', () => {
      const res = new HALResource(clone(example)).listEmbedRels()
      const expected = ['starred']
      assert.deepEqual(res, expected)
    })
  })

  describe('getLinks()', () => {
    it('return empty list', () => {
      const expected = []

      let res = new HALResource().getLinks('self')
      assert.deepEqual(res, expected)

      res = new HALResource(clone(example)).getLinks('selfX')
      assert.deepEqual(res, expected)
    })

    it('return links by rel', () => {
      let res = new HALResource(clone(example)).getLinks('avatar')
      assert.deepEqual(res, [example._links.avatar])

      res = new HALResource(clone(example)).getLinks('related')
      assert.deepEqual(res, example._links.related)
    })

    it('use filterCallback', () => {
      const expected = [{
        href: 'https://twitter.com/hajovsky',
        name: 'twitter'
      }]

      const res = new HALResource(clone(example))
      let links = res.getLinks('related', item => item.name === 'twitter')
      assert.deepEqual(links, expected)

      links = res.getLinks('related', item => Boolean(item.href))
      assert.deepEqual(links, example._links.related)
    })

    it('use begin/end', () => {
      const res = new HALResource(clone(example))
      let links = res.getLinks('related', null, 0)
      assert.deepEqual(links, example._links.related)

      links = res.getLinks('related', null, 1)
      assert.deepEqual(links, example._links.related.slice(1))

      links = res.getLinks('related', null, 0, 1)
      assert.deepEqual(links, example._links.related.slice(0, 1))
    })
  })

  describe('getLink()', () => {
    it('return undefined', () => {
      let res = new HALResource().getLink('selfX')
      assert.equal(res, undefined)

      res = new HALResource(clone(example)).getLink('selfX')
      assert.equal(res, undefined)
    })

    it('return default value', () => {
      const def = { title: 'Untitled' }
      const res = new HALResource().getLink('selfX', def)
      assert.deepEqual(res, def)
    })

    it('return link by rel', () => {
      const res = new HALResource(clone(example))

      assert.deepEqual(res.getLink('avatar'), example._links.avatar)
      assert.deepEqual(res.getLink('related'), example._links.related[0])
    })

    it('use filterCallback', () => {
      const res = new HALResource(clone(example))

      assert.deepEqual(res.getLink('avatar', () => true), example._links.avatar)

      assert.deepEqual(res.getLink('related', item => item.name === 'twitter'), example._links.related[1])

      assert.deepEqual(res.getLink('related', () => true), example._links.related[0])
    })

    it('use filterCallback w/ default value', () => {
      const res = new HALResource(clone(example))
      const def = { title: 'Untitled' }
      assert.deepEqual(res.getLink('related', item => item.name === 'not exists', def), def)
    })
  })

  describe('getEmbeds()', () => {
    it('return empty list', () => {
      let res = new HALResource()
      assert.deepEqual(res.getEmbeds('asdf'), [])

      res = new HALResource(clone(example))
      assert.deepEqual(res.getEmbeds('asdf'), [])
    })

    it('return embedded as HAL Resources', () => {
      const res = new HALResource(clone(example))
      const expected = example._embedded.starred.map(item => new HALResource(item))

      const ret = res.getEmbeds('starred')
      assert.deepEqual(ret, expected)

      assert(ret[0] instanceof HALResource)
    })

    it('user filterCallback', () => {
      const res = new HALResource(clone(example))
      let expected = [new HALResource(example._embedded.starred[1])]
      let embeds = res.getEmbeds('starred', item => item._links.self.href === '/koajs/koa')
      assert.deepEqual(embeds, expected)

      expected = example._embedded.starred.map(item => new HALResource(item))
      embeds = res.getEmbeds('starred', () => true)
      assert.deepEqual(embeds, expected)

      embeds = res.getEmbeds('starred', () => false)
      assert.deepEqual(embeds, [])
    })

    it('use begin/end', () => {
      const res = new HALResource(clone(example))
      const expected = example._embedded.starred.map(item => new HALResource(item))

      let embeds = res.getEmbeds('starred', null, 0)
      assert.deepEqual(embeds, expected)

      embeds = res.getEmbeds('starred', null, 1)
      assert.deepEqual(embeds, expected.slice(1))

      embeds = res.getEmbeds('starred', null, 0, 1)
      assert.deepEqual(embeds, expected.slice(0, 1))
    })
  })

  describe('getEmbed()', () => {
    it('return undefined', () => {
      const res = new HALResource()
      assert.strictEqual(res.getEmbed('item'), undefined)
    })

    it('return default value', () => {
      const res = new HALResource()
      const def = { title: 'Untitled' }
      assert.deepEqual(res.getEmbed('item', def), def)
    })

    it('return embed by rel', () => {
      const res = new HALResource(clone(example))
      const expected = new HALResource(example._embedded.starred[0])
      assert.deepEqual(res.getEmbed('starred'), expected)
    })

    it('use filterCallback', () => {
      const res = new HALResource(clone(example))
      const expected = new HALResource(example._embedded.starred[1])
      assert.deepEqual(res.getEmbed('starred', item => item.title === 'koajs / koa'), expected)
    })

    it('use filterCallback w/ default value', () => {
      const res = new HALResource(clone(example))
      const def = { title: 'Untitled' }
      assert.deepEqual(res.getEmbed('starred', item => item.title === 'not exists', def), def)
    })
  })

  describe('addLink()', () => {
    it('return this', () => {
      const res = new HALResource()
      const ret = res.addLink('self', '/hajovsky')
      assert.equal(ret, res)
    })

    it('add first link (Object)', () => {
      const res = new HALResource()
      const link = { href: '/hajovsky' }

      res.addLink('self', link)
      assert.deepEqual(res.getLink('self'), link)
    })

    it('add first link (string)', () => {
      const res = new HALResource()
      const link = { href: '/hajovsky' }

      res.addLink('self', link.href)
      assert.deepEqual(res.getLink('self'), link)
    })

    it('add second link', () => {
      const res = new HALResource()
                .addLink('related', example._links.related[0])
                .addLink('related', example._links.related[1])

      assert.deepEqual(res.getLinks('related'), example._links.related)
    })
  })

  describe('addEmbed()', () => {
    it('return this', () => {
      const res = new HALResource()
      assert.equal(res, res.addEmbed('starred', { title: 'Untitled' }))
    })

    it('add first embed', () => {
      const res = new HALResource()
      const embed = { title: 'Untitled' }
      const expected = {
        _embedded: {
          item: {
            title: 'Untitled'
          }
        }
      }

      res.addEmbed('item', embed)
      assert.deepEqual(res, expected)
    })

    it('add first embed array', () => {
      const res = new HALResource()
      const embed = [{ title: 'Untitled' }]
      const expected = {
        _embedded: {
          item: [{
            title: 'Untitled'
          }]
        }
      }

      res.addEmbed('item', embed)
      assert.deepEqual(res, expected)
    })

    it('add second embed', () => {
      const res = new HALResource()
      const embed1 = { title: 'Untitled1' }
      const embed2 = [{ title: 'Untitled2' }]
      const expected = {
        _embedded: {
          item: [{
            title: 'Untitled1'
          }, {
            title: 'Untitled2'
          }]
        }
      }

      res.addEmbed('item', embed1)
      res.addEmbed('item', embed2)
      assert.deepEqual(res, expected)
    })

    it('add first embed array', () => {
      const res = new HALResource()
      const embed = [{ title: 'Untitled1' }, { title: 'Untitled2' }]
      const expected = {
        _embedded: {
          item: [
            {
              title: 'Untitled1'
            },
            {
              title: 'Untitled2'
            }
          ]
        }
      }

      res.addEmbed('item', embed)
      assert.deepEqual(res, expected)
    })

    it('add second embed array', () => {
      const res = new HALResource()
      const embed1 = [{ title: 'Untitled1' }, { title: 'Untitled2' }]
      const embed2 = [{ title: 'Untitled3' }, { title: 'Untitled4' }]
      const expected = {
        _embedded: {
          item: [
            {
              title: 'Untitled1'
            },
            {
              title: 'Untitled2'
            },
            {
              title: 'Untitled3'
            },
            {
              title: 'Untitled4'
            }
          ]
        }
      }

      res.addEmbed('item', embed1)
      res.addEmbed('item', embed2)
      assert.deepEqual(res, expected)
    })

    it('add first embed as array second as object', () => {
      const res = new HALResource()
      const embed1 = [{ title: 'Untitled1' }, { title: 'Untitled2' }]
      const embed2 = { title: 'Untitled3' }
      const expected = {
        _embedded: {
          item: [
            {
              title: 'Untitled1'
            },
            {
              title: 'Untitled2'
            },
            {
              title: 'Untitled3'
            }
          ]
        }
      }

      res.addEmbed('item', embed1)
      res.addEmbed('item', embed2)
      assert.deepEqual(res, expected)
    })
  })

  describe('insertEmbed()', () => {
    it('return this', () => {
      const res = new HALResource()
      assert.equal(res, res.addEmbed('starred', { title: 'Untitled' }))
    })

    it('add first embed', () => {
      const res = new HALResource()
      const embed = { title: 'Untitled' }
      const expected = {
        _embedded: {
          item: {
            title: 'Untitled'
          }
        }
      }

      res.insertEmbed('item', -1, embed)
      assert.deepEqual(res, expected)
    })

    it('add second embed before first embed', () => {
      const res = new HALResource()
      const embed1 = { title: 'Untitled1' }
      const embed2 = { title: 'Untitled2' }
      const expected = {
        _embedded: {
          item: [{
            title: 'Untitled2'
          }, {
            title: 'Untitled1'
          }]
        }
      }

      res.insertEmbed('item', -1, embed1)
      res.insertEmbed('item', 0, embed2)
      assert.deepEqual(res, expected)
    })

    it('add third embed before second', () => {
      const res = new HALResource()
      const embed1 = { title: 'Untitled1' }
      const embed2 = { title: 'Untitled2' }
      const embed3 = { title: 'Untitled3' }
      const expected = {
        _embedded: {
          item: [{
            title: 'Untitled1'
          }, {
            title: 'Untitled3'
          }, {
            title: 'Untitled2'
          }]
        }
      }

      res.insertEmbed('item', -1, embed1)
      res.insertEmbed('item', -1, embed2)
      res.insertEmbed('item', 1, embed3)
      assert.deepEqual(res, expected)
    })

    it('add third embed (as an array) before second', () => {
      const res = new HALResource()
      const embed1 = { title: 'Untitled1' }
      const embed2 = { title: 'Untitled2' }
      const embed3 = [
                { title: 'Untitled3a' },
                { title: 'Untitled3b' },
      ]
      const expected = {
        _embedded: {
          item: [{
            title: 'Untitled1'
          }, {
            title: 'Untitled3a'
          }, {
            title: 'Untitled3b'
          }, {
            title: 'Untitled2'
          }]
        }
      }

      res.insertEmbed('item', -1, embed1)
      res.insertEmbed('item', -1, embed2)
      res.insertEmbed('item', 1, embed3)
      assert.deepEqual(res, expected)
    })
  })

  describe('removeLinks()', () => {
    it('remove all links by rel', () => {
      const res = new HALResource(clone(example))
      const expected = clone(example._links)
      delete (expected.related)
      res.removeLinks('related')
      assert.deepEqual(res._links, expected)
    })

    it('ignore missing links', () => {
      const res = new HALResource(clone(example))
      const expected = clone(example._links)
      res.removeLinks('relatedX')
      assert.deepEqual(res._links, expected)
    })

    it('use filterCallback', () => {
      const res = new HALResource(clone(example))
      res.removeLinks('related', item => item.name === 'twitter')
      const expected = clone(example._links)
      expected.related = [expected.related[0]]
      assert.deepEqual(res._links, expected)
    })
  })

  describe('removeEmbeds()', () => {
    it('remove all embeds by rel', () => {
      const res = new HALResource(clone(example))
      res.removeEmbeds('starred')
      assert.deepEqual(res._embedded, {})
      assert.equal(res._embedded.starred, undefined)
    })

    it('ignore missing embeds', () => {
      const expected = clone(example)._embedded
      const res = new HALResource(clone(example))
      res.removeEmbeds('starredX')
      assert.deepEqual(res._embedded, expected)
    })

    it('use filterCallback', () => {
      const res = new HALResource(clone(example))
      res.removeEmbeds('starred', item => item.title === 'koajs / koa')
      const embeds = res.getEmbeds('starred')

      let expected = new HALResource(clone(example)).getEmbeds('starred')
      expected = [expected[0], expected[2]]

      assert.deepEqual(embeds, expected)
    })
  })
})
