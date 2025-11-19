import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
    constructor() { }

    sayHello(): string {
        return 'Hello from UsersService!';
    }
}