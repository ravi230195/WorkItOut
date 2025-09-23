// logger.ts
// ------------------------------------------------------------------
// Levels
export const LOG_LEVELS = {
    ERROR: 0,
    WARN:  1,
    DB:    2,
    PERF:  3,
    INFO:  4,
    DEBUG: 5,
  } as const;
  
  export type LogLevel = keyof typeof LOG_LEVELS;
  
  // ------------------------------------------------------------------
  // Config + level helpers
  const config = {
    logging: { level: 'debug' as LogLevel } // 'error' | 'warn' | 'info' | 'debug'
  };
  
  export const getLogLevel = (): LogLevel => {
    const customLevel = localStorage.getItem('LOG_LEVEL') as LogLevel;
    if (customLevel && LOG_LEVELS[customLevel] !== undefined) return customLevel;
  
    if (typeof process !== 'undefined' && (process as any).env?.LOG_LEVEL) {
      const envLevel = String((process as any).env.LOG_LEVEL).toUpperCase() as LogLevel;
      if (LOG_LEVELS[envLevel] !== undefined) return envLevel;
    }
  
    return config.logging.level;
  };
  
  export const shouldLog = (level: LogLevel): boolean => {
    const currentLevel = getLogLevel();
    return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
  };
  
  // ------------------------------------------------------------------
  // Formatting options (no colors)
  type LevelKey = LogLevel | "LOG";
  
  const LABELS: Record<LevelKey, string> = {
    ERROR: "error",
    WARN:  "warn",
    INFO:  "info",
    DEBUG: "debug",
    DB:    "db",
    PERF:  "perf",
    LOG:   "log",    // alias used by logger.log()
  };
  
  const MAX_LABEL_LEN = Math.max(...Object.values(LABELS).map(s => s.length)); // 5
  
  export type LoggerOptions = {
    showLevel?: boolean;     // [info ] …
    showTime?: boolean;      // 12:34:56
    uppercase?: boolean;     // INFO vs info
    labelWidth?: number;     // padding width (default = longest label)
  };
  
  const opts: Required<LoggerOptions> = {
    showLevel: false,
    showTime:  true,
    uppercase: false,
    labelWidth: MAX_LABEL_LEN,
  };
  
  export const setLoggerOptions = (o: LoggerOptions) => {
    if (typeof o.showLevel === 'boolean') opts.showLevel = o.showLevel;
    if (typeof o.showTime === 'boolean')  opts.showTime  = o.showTime;
    if (typeof o.uppercase === 'boolean') opts.uppercase = o.uppercase;
    if (typeof o.labelWidth === 'number' && o.labelWidth > 0) opts.labelWidth = o.labelWidth;
  };
  
  // ------------------------------------------------------------------
  // Sinks (for in-app panel / remote shipping / etc.)
  export type LogEvent = {
    level: LevelKey;
    ts: Date;
    message: string;
    args: any[];
  };
  
  export type LogSink = (e: LogEvent) => void;
  
  const sinks: LogSink[] = [];
  export const addLogSink = (sink: LogSink) => { sinks.push(sink); };
  export const removeLogSink = (sink: LogSink) => {
    const i = sinks.indexOf(sink);
    if (i >= 0) sinks.splice(i, 1);
  };
  
  // Optional helper: create a ring-buffer sink for quick in-app viewers
  export const createMemorySink = (capacity = 500) => {
    const buf: LogEvent[] = [];
    const sink: LogSink = (e) => {
      buf.push(e);
      if (buf.length > capacity) buf.shift();
    };
    return {
      sink,
      get: () => buf.slice(),
      clear: () => { buf.length = 0; },
    };
  };
  
  // ------------------------------------------------------------------
  // Format helpers
  const timeStamp = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };
  
  const levelTag = (level: LevelKey) => {
    const raw = LABELS[level];
    const label = opts.uppercase ? raw.toUpperCase() : raw;
    // e.g. "[info ] -"
    return `[${label.padEnd(opts.labelWidth, " ")}] -`;
  };
  
  const prefix = (level: LevelKey) => {
    const parts: string[] = [];
    if (opts.showLevel) parts.push(levelTag(level));
    if (opts.showTime)  parts.push(timeStamp());
    // join with a space; the " - " already sits inside levelTag
    return parts.join(" ");
  };
  
  // ------------------------------------------------------------------
  // Emit + print (single point)
  const emit = (level: LevelKey, message: string, args: any[]) => {
    const event: LogEvent = { level, ts: new Date(), message, args };
    for (const s of sinks) {
      try { s(event); } catch { /* sink errors are ignored */ }
    }
  };
  
  const print = (
    level: LevelKey,
    fn: (...args: any[]) => void,
    message: string,
    args: any[]
  ) => {
    // gate: treat .log as DEBUG severity
    const severity: LogLevel = level === "LOG" ? "DEBUG" : level;
    if (!shouldLog(severity)) return;
  
    const line = `${prefix(level)} ${message}`;
    fn(line, ...args);
    emit(level, message, args);
  };
  
  // ------------------------------------------------------------------
  // Public logger API (unchanged)
  export const logger = {
    error: (message: string, ...args: any[]) => print("ERROR", console.error, message, args),
    warn:  (message: string, ...args: any[]) => print("WARN",  console.warn,  message, args),
    info:  (message: string, ...args: any[]) => print("INFO",  console.info,  message, args),
    debug: (message: string, ...args: any[]) => print("DEBUG", console.debug, message, args),
    db:  (message: string, ...args: any[]) => print("DB",  console.info,  message, args),
    perf:  (message: string, ...args: any[]) => print("PERF",  console.info,  message, args),
    // alias -> uses LOG level key, DEBUG gate
    log:   (message: string, ...args: any[]) => print("LOG",   console.log,   message, args),
  };
  
  // ------------------------------------------------------------------
  // Level controls (unchanged)
  export const setLogLevel = (level: LogLevel): void => {
    if (LOG_LEVELS[level] !== undefined) {
      localStorage.setItem('LOG_LEVEL', level);
      // NOTE: we deliberately use console.info here to avoid recursion
      console.info(`[info ] - Log level set to: ${level}`);
    } else {
      console.error(`[error] - Invalid log level: ${level}`);
    }
  };
  
  export const getAvailableLogLevels = (): LogLevel[] => {
    return Object.keys(LOG_LEVELS) as LogLevel[];
  };
  