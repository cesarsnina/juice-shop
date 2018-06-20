const utils = require('../lib/utils')
const challenges = require('../data/datacache').challenges
const insecurity = require('../lib/insecurity')
const models = require('../models/index')
const clarinet = require('clarinet')

module.exports = function addBasketItem () {
  return (req, res, next) => {
    const parser = clarinet.parser()
    const result = []
    parser.onkey = parser.onopenobject = k => {
      result.push({key: k, value: null})
    }
    parser.onvalue = v => {
      result[result.length - 1].value = v
    }
    parser.write(req.rawBody).close()

    var productIds = []
    var basketIds = []
    var quantities = []

    for (var i = 0; i < result.length; i++) {
      if (result[i].key === 'ProductId') {
        productIds.push(result[i].value)
      } else if (result[i].key === 'BasketId') {
        basketIds.push(result[i].value)
      } else if (result[i].key === 'quantity') {
        quantities.push(result[i].value)
      }
    }

    const user = insecurity.authenticatedUsers.from(req)
    if (user && basketIds[0] && basketIds[0] !== 'undefined' && user.bid != basketIds[0]) { // eslint-disable-line eqeqeq
      res.status(401).send('{\'error\' : \'Invalid BasketId\'}')
    } else {
      const basketItem = {
        ProductId: productIds[productIds.length - 1],
        BasketId: basketIds[basketIds.length - 1],
        quantity: quantities[quantities.length - 1]
      }

      if (utils.notSolved(challenges.basketManipulateChallenge)) {
        if (user && basketItem.BasketId && basketItem.BasketId !== 'undefined' && user.bid != basketItem.BasketId) { // eslint-disable-line eqeqeq
          utils.solve(challenges.basketManipulateChallenge)
        }
      }

      const basketItemInstance = models.BasketItem.build(basketItem)
      basketItemInstance.save().then((basketItem) => {
        basketItem = {
          status: 'success',
          data: basketItem
        }
        res.json(basketItem)
      }).catch(error => {
        next(error)
      })
    }
  }
}
