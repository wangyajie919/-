module.exports = {
  apps: [
    {
      name: 'wood-materials-ai',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '1G',
      restart_delay: 4000,
      log_file: 'logs/app.log',
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};