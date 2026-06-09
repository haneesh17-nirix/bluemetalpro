type Level = 'info' | 'warn' | 'error' | 'debug';

function emit(level: Level, event: string, detail?: Record<string, unknown>): void {
  const time = new Date().toTimeString().slice(0, 8);
  const prefix = `[BlueMetal] [${level.toUpperCase()}] ${time}`;
  let message = event;
  if (detail && Object.keys(detail).length > 0) {
    const pairs = Object.entries(detail)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    message = `${event} — ${pairs}`;
  }
  const output = `${prefix} ${message}`;
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const log = {
  page(name: string, detail?: Record<string, unknown>): void {
    emit('info', `Page loaded: ${name}`, detail);
  },
  screen(name: string, detail?: Record<string, unknown>): void {
    emit('info', `Screen: ${name}`, detail);
  },
  action(name: string, detail?: Record<string, unknown>): void {
    emit('info', `Action: ${name}`, detail);
  },
  warn(msg: string, detail?: Record<string, unknown>): void {
    emit('warn', msg, detail);
  },
  error(msg: string, detail?: Record<string, unknown>): void {
    emit('error', msg, detail);
  },
  debug(msg: string, detail?: Record<string, unknown>): void {
    emit('debug', msg, detail);
  },
};
