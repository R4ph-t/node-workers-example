const {env} = require('node:process')

module.exports = {
  apps: [
    {
      name: "server",
      script: "./server.js",
      exec_mode: "cluster",
      instances: env.WEB_CONCURRENCY || 1
    },
    {
      name: 'worker',
      script: "./worker.js",
      exec_mode: "cluster",
      instances: env.WEB_CONCURRENCY || 1
    }
  ]
}
