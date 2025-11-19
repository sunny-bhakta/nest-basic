import { LoggerMiddleware } from './logger.middleware';

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    middleware = new LoggerMiddleware();
    req = { method: 'GET', url: '/test' };
    res = {};
    next = jest.fn();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.log as jest.Mock).mockRestore();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should call console.log with correct message', () => {
    middleware.use(req, res, next);
    expect(console.log).toHaveBeenCalledWith(
      `From Middleware : [Request] ${req.method} ${req.url}`
    );
  });

  it('should call next function', () => {
    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
