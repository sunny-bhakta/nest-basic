import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let mockContext: any;

  beforeEach(() => {
    guard = new RolesGuard();
    mockContext = {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if user has admin role', () => {
    const user = { roles: ['admin', 'user'] };
    mockContext.getRequest = jest.fn().mockReturnValue({ user });
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should deny access if user does not have admin role', () => {
    const user = { roles: ['user'] };
    mockContext.getRequest = jest.fn().mockReturnValue({ user });
    expect(guard.canActivate(mockContext)).toBe(false);
  });

  it('should deny access if user is missing', () => {
    mockContext.getRequest = jest.fn().mockReturnValue({});
    expect(guard.canActivate(mockContext)).toBe(false);
  });

  it('should deny access if roles are missing', () => {
    const user = {};
    mockContext.getRequest = jest.fn().mockReturnValue({ user });
    expect(guard.canActivate(mockContext)).toBe(false);
  });
});
