export const apps = [
  {
    name: 'server',
    script: './dist/bin/server.js',
    exec_mode: 'cluster',
    instances: 4,
    wait_ready: true,
    listen_timeout: 30000
  }
]
