export interface IPerfLog<T> {
    type: string;
    time: number;
    createdOn?: number;
    metaData: T
}