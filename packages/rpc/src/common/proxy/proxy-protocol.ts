import { ErrorConverter } from '../converter';
import { JsonRpcProxy } from '../factory';

export const ProxyProvider = Symbol('ProxyProvider');

export interface ProxyProvider {
    provide<T extends object>(path: string, errorConverters?: ErrorConverter[], target?: object): JsonRpcProxy<T>;
}

export const ProxyCreator = Symbol('ProxyCreator');

export interface ProxyCreator {
    create<T extends object>(path: string, errorConverters?: ErrorConverter[], target?: object): JsonRpcProxy<T>;
    support(path: string): number
}

export interface ConnectionOptions {
    reconnecting?: boolean;
}

export interface RequestTaskMeta {
    id: number | NodeJS.Timeout;
    contentLength: number;
    contents: string[];
    task: () => Promise<void>;
}
