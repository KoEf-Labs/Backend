module.exports = {
  apps: [
    {
      name: "website-builder-api",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "./",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Restart settings
      max_restarts: 10,
      restart_delay: 5000,
      autorestart: true,

      // Logs
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/pm2/api-error.log",
      out_file: "/var/log/pm2/api-out.log",
      merge_logs: true,

      // Memory limit (restart if exceeded)
      max_memory_restart: "512M",
    },
  ],
};
