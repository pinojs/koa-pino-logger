'use strict'

const Koa = require('koa')
const logger = require('./')

const app = new Koa()
app.silent = true // disable console.errors
app.use(logger())

app.use((ctx) => {
  ctx.body = 'hello world'
  throw Error('bang!')
})

app.listen(3000)
