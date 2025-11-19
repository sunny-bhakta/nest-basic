import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './user.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sayHello', () => {
    it('should return greeting message', () => {
      const result = service.sayHello();
      expect(result).toBe('Hello from UsersService!');
    });

    it('should return a string', () => {
      const result = service.sayHello();
      expect(typeof result).toBe('string');
    });

    it('should not return empty string', () => {
      const result = service.sayHello();
      expect(result).not.toBe('');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});