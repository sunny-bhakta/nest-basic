import { GreetGerman } from './greet.german';

describe('GreetGerman', () => {
  let greetGerman: GreetGerman;

  beforeEach(() => {
    greetGerman = new GreetGerman();
  });

  it('should be defined', () => {
    expect(greetGerman).toBeDefined();
  });

  it('should implement IUserService interface', () => {
    expect(greetGerman).toBeInstanceOf(GreetGerman);
    expect(typeof greetGerman.useClassGreetByLanguage).toBe('function');
  });

  describe('useClassGreetByLanguage', () => {
    it('should return German greeting with content', () => {
      const content = 'Welt';
      const result = greetGerman.useClassGreetByLanguage(content);
      expect(result).toEqual({'useClass':'Hallo! Welt.'});
    });

    it('should handle different content values', () => {
      const testCases = [
        { input: 'Hans', expected: 'Hallo! Hans.' },
        { input: 'NestJS', expected: 'Hallo! NestJS.' },
        { input: 'Dynamisches Modul', expected: 'Hallo! Dynamisches Modul.' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = greetGerman.useClassGreetByLanguage(input);
        expect(result).toEqual({'useClass': expected});
      });
    });

    it('should handle empty string', () => {
      const result = greetGerman.useClassGreetByLanguage('');
      expect(result).toEqual({'useClass': 'Hallo! .'});
    });

    it('should handle special characters', () => {
      const result = greetGerman.useClassGreetByLanguage('Test@123!');
      expect(result).toEqual({'useClass': 'Hallo! Test@123!.'});
    });

    it('should return a string', () => {
      const result = greetGerman.useClassGreetByLanguage('test');
      expect(typeof result).toBe('object');
    });


    it('should differ from English greeting', () => {
      const content = 'World';
      const germanResult = greetGerman.useClassGreetByLanguage(content);
      const expectedEnglishResult = 'Hello! World.';
      expect(germanResult).not.toBe(expectedEnglishResult);
      expect(germanResult).toEqual({'useClass': 'Hallo! World.'});
    });
  });
});