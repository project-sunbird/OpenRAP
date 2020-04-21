import { IPerfLog } from './IPerfLog';
export declare class PerfLogger {
    private dbSDK;
    private settingSDK;
    private telemetryInstance;
    initialize(initial_trigger?: number, scheduled_trigger?: number): void;
    private handleTimerEvent;
    private aggregateLogs;
    private getUnProcessedLogsIterator;
    private generateTelemetryMetrics;
    findMinMaxAvg(arr?: any[]): {
        max: any;
        min: any;
        avg: number;
    };
    private updateLastSyncDate;
    private getLogsFromDB;
    private getStartAndEndEpochTime;
    log<T>(logData: IPerfLog<T>): void;
    private archiveOldLogs;
}
