import {Worker} from 'bullmq'
import Redis from 'ioredis'
import {env} from 'node:process'
import {URL} from 'url'

const redisUrl = new URL(env.REDIS_URL || 'redis://127.0.0.1:6379')

// Connect to a local redis instance locally, and the Heroku-provided URL in production
const redisConnection = new Redis({
  host: redisUrl.hostname,
  port: redisUrl.port,
  user: redisUrl.username,
  password: redisUrl.password,
  // Redis connections on Heroku use TLS to encrypt traffic + self-signed certificates so we'll
  // configure this client with `rejectUnauthorized` to treat this connection as trusted.
  // See: https://devcenter.heroku.com/articles/connecting-heroku-redis
  tls: redisUrl.protocol === 'rediss:' ? { rejectUnauthorized: false } : false,
  maxRetriesPerRequest: null
})

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processJob(job) {
  console.log(`Processing job: ${job.id}`);
  // This is an example job that just slowly reports on progress
  // while doing no work. Replace this with your own job logic.
  let progress = 0

  // throw an error 5% of the time
  if (Math.random() < 0.05) {
    throw new Error("This job failed!")
  }

  while (progress < 100) {
    await sleep(50)
    progress += 1
    await job.updateProgress(progress)
  }

  // A job can return values that will be stored in Redis as JSON
  // This return value is unused in this demo application.
  return { value: "This will be stored" }
}

redisConnection.on('error', (err) => {
  console.error(err)
})

redisConnection.on('connect', () => {
  console.log('Redis connected')
  // Connect to the named work queue
  new Worker('work', processJob, {
    connection: redisConnection,
    // The maximum number of jobs each worker should process at once. This will need
    // to be tuned for your application. If each job is mostly waiting on network
    // responses it can be much higher. If each job is CPU-intensive, it might need
    // to be much lower.
    concurrency: 50
  })
})
