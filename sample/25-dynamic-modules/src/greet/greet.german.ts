import { IUserService } from "../interface/interface";

export class GreetGerman implements IUserService {
    useClassGreetByLanguage(content: string): any {
        return {"useClass": `Hallo! ${content}.`};
    }
}
