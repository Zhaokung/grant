
var urlib = require('url')
var qs = require('qs')

var _consumer = require('../consumer')


module.exports = function (config) {
  var app = {}

  function register (server, options, next) {
    var consumer = _consumer({
      config: Object.keys(options).length ? options : config
    })
    app.config = consumer.config

    // connect
    server.route({
      method: ['GET', 'POST'],
      path: '/connect/{provider}/{override?}',
      handler: (req, res) => {
        if (!(req.session || req.yar)) {
          throw new Error('Grant: register session plugin first')
        }

        var query = (parseInt(server.version.split('.')[0]) >= 12)
          ? qs.parse(urlib.parse(req.url, false).query) // #2985
          : req.query

        var body = (parseInt(server.version.split('.')[0]) >= 12)
          ? qs.parse(req.payload) // #2985
          : req.payload

        consumer({
          method: req.method,
          params: req.params,
          query: query,
          body: body,
          state: req.plugins.grant,
          session: (req.session || req.yar).get('grant'),
        }).then(({error, url, session, state}) => {
          ;(req.session || req.yar).set('grant', session)
          req.plugins.grant = state
          error ? res(error) : url ? res.redirect(url) : res.continue()
        })
      }
    })

    server.route({
      method: 'GET',
      path: '/connect/{provider}/callback',
      handler: (req, res) => {
        var query = (parseInt(server.version.split('.')[0]) >= 12)
          ? qs.parse(urlib.parse(req.url, false).query) // #2985
          : req.query

        var body = (parseInt(server.version.split('.')[0]) >= 12)
          ? qs.parse(req.payload) // #2985
          : req.payload

        var params = {
          provider: req.params.provider,
          override: 'callback'
        }

        consumer({
          method: req.method,
          params: params,
          query: query,
          body: body,
          state: req.plugins.grant,
          session: (req.session || req.yar).get('grant'),
        }).then(({error, url, session, state}) => {
          ;(req.session || req.yar).set('grant', session)
          req.plugins.grant = state
          error ? res(error) : url ? res.redirect(url) : res.continue()
        })
      }
    })

    next()
  }

  register.attributes = {
    pkg: require('../../package.json')
  }

  app.register = register
  return app
}
