'use strict'

const logger = require('koa-bunyan-logger')
const Koa = require('koa')

const app = new Koa()
app.use(logger())
app.use(logger.requestLogger())

app.use((ctx) => {
  ctx.body = 'hello world'
})

app.listen(3000)
