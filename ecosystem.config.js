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
    {
      name: "cleanup-expired-tokens",
      script: "node_modules/.bin/tsx",
      args: "scripts/cleanup-expired-tokens.ts",
      cwd: "./",
      instances: 1,
      exec_mode: "fork",
      autorestart: false,
      // Run every day at 03:00
      cron_restart: "0 3 * * *",
      env: {
        NODE_ENV: "production",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/pm2/cleanup-error.log",
      out_file: "/var/log/pm2/cleanup-out.log",
      merge_logs: true,
    },
    {
      name: "aggregate-site-views",
      script: "node_modules/.bin/tsx",
      args: "scripts/aggregate-site-views.ts",
      cwd: "./",
      instances: 1,
      exec_mode: "fork",
      autorestart: false,
      // Run every day at 04:00 UTC (after token cleanup)
      cron_restart: "0 4 * * *",
      env: {
        NODE_ENV: "production",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/pm2/aggregate-error.log",
      out_file: "/var/log/pm2/aggregate-out.log",
      merge_logs: true,
    },
  ],
};
