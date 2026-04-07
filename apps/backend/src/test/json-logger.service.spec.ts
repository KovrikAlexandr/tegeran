import { JsonLogger } from '../logging/json-logger.service';

describe('JsonLogger', () => {
  const stdoutWrite = process.stdout.write.bind(process.stdout);

  afterEach(() => {
    process.stdout.write = stdoutWrite;
    delete process.env.LOG_LEVEL;
  });

  it('writes JSON logs to stdout for INFO and includes required fields', () => {
    process.env.LOG_LEVEL = 'INFO';
    const logger = new JsonLogger();
    const written: string[] = [];

    process.stdout.write = ((chunk: string | Uint8Array) => {
      written.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    logger.info('Backend service started', 'Bootstrap', { authEnabled: false });

    expect(written).toHaveLength(1);

    const payload = JSON.parse(written[0]);
    expect(payload).toMatchObject({
      level: 'INFO',
      message: 'Backend service started',
      context: 'Bootstrap',
      authEnabled: false,
    });
    expect(typeof payload.timestamp).toBe('string');
  });

  it('filters lower-priority messages according to LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'WARNING';
    const logger = new JsonLogger();
    const written: string[] = [];

    process.stdout.write = ((chunk: string | Uint8Array) => {
      written.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    logger.debug('debug', 'TestLogger');
    logger.info('info', 'TestLogger');
    logger.warning('warning', 'TestLogger');

    expect(written).toHaveLength(1);
    expect(JSON.parse(written[0])).toMatchObject({
      level: 'WARNING',
      message: 'warning',
    });
  });

  it('writes ERROR logs to stdout in JSON format', () => {
    process.env.LOG_LEVEL = 'DEBUG';
    const logger = new JsonLogger();
    const written: string[] = [];

    process.stdout.write = ((chunk: string | Uint8Array) => {
      written.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    logger.error('Database query failed', 'PrismaUsersDao', {
      operation: 'findById',
    });

    expect(written).toHaveLength(1);
    expect(JSON.parse(written[0])).toMatchObject({
      level: 'ERROR',
      message: 'Database query failed',
      context: 'PrismaUsersDao',
      operation: 'findById',
    });
  });
});
