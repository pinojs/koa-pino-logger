# koa-pino-logger

[![Build Status](https://img.shields.io/github/workflow/status/pinojs/koa-pino-logger/CI)](https://github.com/pinojs/koa-pino-logger/actions)

[pino](https://github.com/pinojs/pino) logging [koa](http://npm.im/koa) middleware

Note: For Koa v1 see [v1 readme](https://github.com/pinojs/koa-pino-logger/tree/v1)

To our knowledge, `koa-pino-logger` is the [fastest](#benchmarks) JSON [koa](http://npm.im/koa) logger in town.

* [Benchmarks](#benchmarks)
* [Installation](#install)
* [Usage](#example)
* [API](#api)
* [Acknowledgements](#acknowledgements)
* [License](#license)

## Benchmarks

Benchmarks log each request/response pair while returning
`'hello world'`, using
[autocannon](https://github.com/pinojs/autocannon) with 100
connections and pipelining set to 1 (koa can't handle pipelining): `autocannon -c 100 -p 1 http://localhost:3000`.

* `koa-bunyan-logger`: 5844 req/sec
* `koa-logger`: 9401 req/sec
* `koa-morgan`: 10881 req/sec
* `koa-pino-logger`: 10534 req/sec
* `koa-pino-logger` (extreme): 11112 req/sec
* koa w/out logger: 14518 req/sec

All benchmarks where taken on a Macbook Pro 2013 (2.6GHZ i7, 16GB of RAM). 

Benchmarking against `koa-logger` is an apples vs oranges situation. `koa-logger` is for development logging, and has extremely simple (non-JSON) output. Still, `koa-pino-logger` is faster so... why not. 

Additionally, whilst we're comparing `koa-pino-logger` against [koa-morgan](http://npm.im/koa-morgan), this isn't really a fair contest. 

Morgan doesn't support logging arbitrary data, nor does it output JSON. Further Morgan [uses a form of `eval`](https://github.com/koajs/morgan/blob/5da5ff1f5446e3f3ff29d29a2d6582712612bf89/index.js#L383) to achieve high speed logging. Whilst probably safe, using `eval` at all tends to cause concern, particular when it comes to server-side JavaScript.

The fact that `koa-pino-logger` achieves similar throughput with JSON logging **and** arbitrary data, without using `eval`, serves to emphasise the high-speed capabilities of `koa-pino-logger`. 

With `koa-pino-logger` you can have features, safety **and** speed. 

## Install

```sh
npm install --save koa-pino-logger
```

## Example

### Request logging

```js
'use strict'

var koa = require('koa')
var logger = require('koa-pino-logger')

var app = new Koa()
app.use(logger())

app.use((ctx) => {
  ctx.log.info('something else')
  ctx.body = 'hello world'
})

app.listen(3000)
```
```
$ node example.js | pino
[2016-04-21T10:46:47.292Z] INFO (18254 on MacBook-Pro-4.local): something else
    req: {
      "id": 1,
      "method": "GET",
      "url": "/",
      "headers": {
        "host": "localhost:3000",
        "user-agent": "curl/7.43.0",
        "accept": "*/*"
      },
      "remoteAddress": "::1",
      "remotePort": 64839
    }
[2016-04-21T10:46:47.300Z] INFO (18254 on MacBook-Pro-4.local): request completed
    res: {
      "statusCode": 200,
      "header": "HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 11\r\nDate: Thu, 21 Apr 2016 10:46:47 GMT\r\nConnection: keep-alive\r\n\r\n"
    }
    responseTime: 8
    req: {
      "id": 1,
      "method": "GET",
      "url": "/",
      "headers": {
        "host": "localhost:3000",
        "user-agent": "curl/7.43.0",
        "accept": "*/*"
      },
      "remoteAddress": "::1",
      "remotePort": 64839
    }
```

### Thrown Error logging


```js
'use strict'

var koa = require('koa')
var logger = require('koa-pino-logger')

var app = new Koa()
app.silent = true // disable console.errors
app.use(logger())

app.use((ctx) => {
  ctx.body = 'hello world'
  throw Error('bang!')
})

app.listen(3000)
```

```
$ node error-example.js | pino
$ node error-example.js | pino
[2016-04-21T13:05:10.298Z] ERROR (20482 on MacBook-Pro-4.local): request errored
    res: {
      "statusCode": 200,
      "header": null
    }
    err: {
      "type": "Error",
      "message": "bang!",
      "stack": "Error: bang!\n    at Error (native)\n    at /Users/davidclements/z/nearForm/koa-pino-logger/error-example.js:12:9\n    at dispatch (/Users/davidclements/z/nearForm/koa-pino-logger/node_modules/koa/node_modules/koa-compose/index.js:43:32)\n    at next (/Users/davidclements/z/nearForm/koa-pino-logger/node_modules/koa/node_modules/koa-compose/index.js:44:18)\n    at pino (/Users/davidclements/z/nearForm/koa-pino-logger/logger.js:13:12)\n    at dispatch (/Users/davidclements/z/nearForm/koa-pino-logger/node_modules/koa/node_modules/koa-compose/index.js:43:32)\n    at /Users/davidclements/z/nearForm/koa-pino-logger/node_modules/koa/node_modules/koa-compose/index.js:36:12\n    at Server.<anonymous> (/Users/davidclements/z/nearForm/koa-pino-logger/node_modules/koa/lib/application.js:135:7)\n    at emitTwo (events.js:100:13)\n    at Server.emit (events.js:185:7)"
    }
    req: {
      "id": 1,
      "method": "GET",
      "url": "/",
      "headers": {
        "host": "localhost:3000",
        "user-agent": "curl/7.43.0",
        "accept": "*/*"
      },
      "remoteAddress": "::1",
      "remotePort": 50934
    }
[2016-04-21T13:05:10.305Z] INFO (20482 on MacBook-Pro-4.local): request completed
    res: {
      "statusCode": 500,
      "header": "HTTP/1.1 500 Internal Server Error\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 21\r\nDate: Thu, 21 Apr 2016 13:05:10 GMT\r\nConnection: keep-alive\r\n\r\n"
    }
    responseTime: 11
    req: {
      "id": 1,
      "method": "GET",
      "url": "/",
      "headers": {
        "host": "localhost:3000",
        "user-agent": "curl/7.43.0",
        "accept": "*/*"
      },
      "remoteAddress": "::1",
      "remotePort": 50934
    }
```

## API

`koa-pino-logger` has the same options as
[pino](http://npm.im/pino)
`koa-pino-logger` will log when a request finishes or errors. 

Along with automated request logging, the pino logger facilitates manual logging 
by adding the pino logger instance to the the context, request, response, req and res objects:

```js
  app.use((ctx, next) => {
    ctx.log.info('test 1')
    ctx.request.log.info('test 2')
    ctx.response.log.info('test 3')
    ctx.res.log.info('test 4')
    ctx.req.log.info('test 5')
    return next()
  })
```

We recommend using `ctx.log` in the general case.

## License

MIT
