export interface IForRootAsyncResult {
    forRootAsyncProvider: string;
}

export interface IForFeatureAsync {
    forFeatureAsyncProvider: string;
}

export interface IAsyncFactoryOptions<T> {
    imports?: any[];
    inject?: any[];
    useFactory: (...args: any[]) => Promise<T> | T;
}

export interface IUserService {
    useClassGreetByLanguage(content: string): any;    
}