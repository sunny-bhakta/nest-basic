import { IUserService } from "../interface/interface";

export class GreetEnglish implements IUserService {
    useClassGreetByLanguage(content: string): any {
        return {"useClass": `Hello! ${content}.`};
    }
}