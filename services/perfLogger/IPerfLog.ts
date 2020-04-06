export interface IPerfLog<T> {
    type: string;
    time: number;
    createdAt?: number;
    metaData: T
}