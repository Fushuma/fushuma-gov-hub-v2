module.exports = {
  apps: [
    {
      name: 'fushuma-gov-v2',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/home/azureuser/fushuma-gov-hub-v2',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/home/azureuser/logs/v2-error.log',
      out_file: '/home/azureuser/logs/v2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 4000,
    },
  ],
};
