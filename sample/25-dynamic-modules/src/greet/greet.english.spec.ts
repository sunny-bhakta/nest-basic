import { GreetEnglish } from './greet.english';

describe('GreetEnglish', () => {
  let greetEnglish: GreetEnglish;

  beforeEach(() => {
    greetEnglish = new GreetEnglish();
  });

  it('should be defined', () => {
    expect(greetEnglish).toBeDefined();
  });

  it('should implement IUserService interface', () => {
    expect(greetEnglish).toBeInstanceOf(GreetEnglish);
    expect(typeof greetEnglish.useClassGreetByLanguage).toBe('function');
  });

  describe('useClassGreetByLanguage', () => {
    it('should return English greeting with content', () => {
      const content = 'World';
      const result = greetEnglish.useClassGreetByLanguage(content);
      expect(result).toEqual({'useClass': 'Hello! World.'});
    });

    it('should handle different content values', () => {
      const testCases = [
        { input: 'John', expected: 'Hello! John.' },
        { input: 'NestJS', expected: 'Hello! NestJS.' },
        { input: 'Dynamic Module', expected: 'Hello! Dynamic Module.' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = greetEnglish.useClassGreetByLanguage(input);
        expect(result).toEqual({'useClass': expected});
      });
    });

    it('should handle empty string', () => {
      const result = greetEnglish.useClassGreetByLanguage('');
      expect(result).toEqual({'useClass': 'Hello! .'});
    });

    it('should handle special characters', () => {
      const result = greetEnglish.useClassGreetByLanguage('Test@123!');
      expect(result).toEqual({'useClass': 'Hello! Test@123!.'});
    });

    it('should return a string', () => {
      const result = greetEnglish.useClassGreetByLanguage('test');
      expect(typeof result).toBe('object');
    });    
  });
});