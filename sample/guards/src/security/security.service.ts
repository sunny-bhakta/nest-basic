import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AccessLevel } from "../enums/access-level.enum";


@Injectable()
export class SecurityService {
    private readonly validTokens = new Map<string, any>();

    constructor() {}

    async generateToken(credentials: any): Promise<string> {
        const token = "uuidv4" + "-" + Math.random().toString(36).substring(2);
        const user = {
            id: credentials.userId || 1,
            username: credentials.userName || "demo_user",
            accessLevel: credentials.accessLevel || AccessLevel.STANDARD,
            tokenIssuedAt: new Date(),
        };

        this.validTokens.set(token, user);
        return token;
    }

    async validateToken(token: string): Promise<any> {
        const user = this.validTokens.get(token);

        if (!user) {
            throw new Error('Invalid token 123');
        }

        const tokenAge = Date.now() - user.tokenIssuedAt.getTime();
        const maxTokenAge = 1000 * 60 * 60; // 1 hour

        if (tokenAge > maxTokenAge) {
            this.validTokens.delete(token);
            throw new UnauthorizedException('Token expired');
        }

        return user;
    }

    async validateCredentials(username: string, password: string): Promise<any> {
      const demoUsers = [
        { 
          username: 'admin', 
          password: 'admin', 
          accessLevel: AccessLevel.ADMIN,
          userId: 1 
        },
        { 
          username: 'user', 
          password: 'user', 
          accessLevel: AccessLevel.STANDARD,
          userId: 2 
        },
        { 
          username: 'premium', 
          password: 'premium123', 
          accessLevel: AccessLevel.PREMIUM,
          userId: 3 
        },
      ];

      const user = demoUsers.find(u => u.username === username);
      if (!user || !(password === user.password)) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return {
        userId: user.userId,
        username: user.username,
        accessLevel: user.accessLevel,
      };
  }
     
}