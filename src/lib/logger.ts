/**
 * Structured JSON logger.
 * Outputs one JSON line per event — easy to parse with log aggregators
 * (Datadog, CloudWatch, Loki, etc.)
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) =>
    log("info", message, meta),

  warn: (message: string, meta?: Record<string, unknown>) =>
    log("warn", message, meta),

  error: (message: string, meta?: Record<string, unknown>) =>
    log("error", message, meta),

  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      log("debug", message, meta);
    }
  },

  /** Log an HTTP request (call from middleware or route) */
  request: (req: {
    method: string;
    url: string;
    status: number;
    durationMs: number;
    userId?: string;
    ip?: string;
  }) => {
    log("info", `${req.method} ${req.url} ${req.status}`, {
      type: "http",
      method: req.method,
      url: req.url,
      status: req.status,
      durationMs: req.durationMs,
      userId: req.userId,
      ip: req.ip,
    });
  },

  /** Log an auth event */
  auth: (
    event: "login" | "register" | "logout" | "refresh" | "login_failed" | "password_reset",
    meta?: Record<string, unknown>
  ) => {
    log("info", `auth:${event}`, { type: "auth", event, ...meta });
  },

  /** Log a security event */
  security: (
    event: string,
    meta?: Record<string, unknown>
  ) => {
    log("warn", `security:${event}`, { type: "security", event, ...meta });
  },
};
