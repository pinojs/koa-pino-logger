'use strict'

const Koa = require('koa')
const logger = require('./')

const app = new Koa()
app.use(logger({
  autoLogging: {
    ignorePaths: [
      '/favicon.ico',
      /^\/static\/.*$/
    ]
  }
}))

app.use((ctx) => {
  ctx.log.append({ spicy: false })
  ctx.log.warn('where is the heat?') // will log { spicy: false }
  ctx.body = 'hello world'
  ctx.log.append({ spicy: true })
  ctx.log.append({ dogsOrCats: 'both' }) // will log { spicy: true, dogsOrCats: both }
})

app.listen(3000)
