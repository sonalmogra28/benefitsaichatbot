import { Logging } from '@google-cloud/logging';

type Severity =
  | 'DEBUG'
  | 'INFO'
  | 'NOTICE'
  | 'WARNING'
  | 'ERROR'
  | 'CRITICAL'
  | 'ALERT'
  | 'EMERGENCY';

const logging = new Logging();
const log = logging.log('application');
const hasProject = !!process.env.GOOGLE_CLOUD_PROJECT || !!process.env.GCLOUD_PROJECT;

async function write(severity: Severity, message: string, data?: Record<string, unknown>) {
  const payload = { message, ...data };
  if (!hasProject) {
    console.log(JSON.stringify({ severity, ...payload }));
    return;
  }
  const metadata = { resource: { type: 'global' }, severity } as const;
  const entry = log.entry(metadata, payload);
  try {
    await log.write(entry);
  } catch (err) {
    // Fallback to console if logging fails
    console.error('Cloud Logging write failed', err);
    console.log(JSON.stringify({ severity, ...payload }));
  }
}

export const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    void write('INFO', message, data);
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    void write('WARNING', message, data);
  },
  error: (message: string, data?: Record<string, unknown>) => {
    void write('ERROR', message, data);
  },
};

export default logger;
