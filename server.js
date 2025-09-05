import express from 'express'
import {Queue} from 'bullmq'
import Redis from 'ioredis'
import {env} from 'node:process'
import { dirname } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

// Get the directory this script is located in
const root = dirname(fileURLToPath(import.meta.url))

// Serve on PORT on Heroku and on localhost:5001 locally
const PORT = env.PORT || '5001'

// Connect to a local redis instance locally, and the Heroku-provided URL in production
const redisUrl = new URL(env.REDIS_URL || 'redis://127.0.0.1:6379')

const redisConnection = new Redis({
  host: redisUrl.hostname,
  port: redisUrl.port,
  user: redisUrl.username,
  password: redisUrl.password,
  // Redis connections on Heroku use TLS to encrypt traffic + self-signed certificates so we'll
  // configure this client with `rejectUnauthorized` to treat this connection as trusted.
  // See: https://devcenter.heroku.com/articles/connecting-heroku-redis
  tls: redisUrl.protocol === 'rediss:' ? { rejectUnauthorized: false } : false,
})

// Create / Connect to a named work queue
const workQueue = new Queue('work', {
  connection: redisConnection
})

// Create our server app
const app = express()

// Serve the two static assets
app
  .get('/', (req, res) => {
    res.sendFile('index.html', { root })
  })
  .get('/client.js', (req, res) => {
    res.sendFile('client.js', { root })
  })

// Kick off a new job by adding it to the work queue
app.post('/job', async (req, res) => {
  // This would be where you could pass arguments as job data
  // Ex: workQueue.add('paint', { color: 'red' })
  // Docs: https://api.docs.bullmq.io/classes/v5.Queue.html#add
  const data = {} // empty for this example app
  const job = await workQueue.add('example', data)
  console.log(`Enqueued job: ${job.id}`)
  res.json({
    id: job.id
  })
});

// Allows the client to query the state of a background job
app.get('/job/:id', async (req, res) => {
  const { id } = req.params
  const job = await workQueue.getJob(id)

  if (job === null) {
    res.status(404).end()
  } else {
    let state = await job.getState()
    const { progress, failedReason } = job
    res.json({
      id,
      state,
      progress,
      failedReason
    })
  }
});

// You can listen to events to get notified when jobs are processed
workQueue.on('removed', async (job) => {
  console.log(`Job removed with result ${await job.getState()}`)
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`)
})
