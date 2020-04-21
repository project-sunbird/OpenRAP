export declare const perfLogDataSet1: {
    currentDate: number;
    lastSyncDate: number;
    logs: ({
        type: string;
        time: number;
        metaData: {
            contentSize?: undefined;
            ecarSourcePath?: undefined;
            step?: undefined;
            contentId?: undefined;
            mimeType?: undefined;
            contentType?: undefined;
            pkgVersion?: undefined;
        };
        createdOn: number;
        _id: string;
    } | {
        type: string;
        time: number;
        metaData: {
            contentSize: number;
            ecarSourcePath: string;
            step: string;
            contentId: string;
            mimeType: string;
            contentType: string;
            pkgVersion: string;
        };
        createdOn: number;
        _id: string;
    })[];
};
export declare const INITIAL_TRIGGER: number;
export declare const DAY_IN_MILLISECONDS: number;
export declare const MONTH_IN_MILLISECONDS: number;
