import { Singleton } from "typescript-ioc";
import * as _ from "lodash";
import { Inject } from "typescript-ioc";
import { DataBaseSDK } from "../../sdks/DataBaseSDK";
import SettingSDK from '../../sdks/SettingSDK';
import { logger } from "@project-sunbird/logger";
import { TelemetryInstance } from './../telemetry/telemetryInstance';
import { IPerfLog } from './IPerfLog';
import { timer } from 'rxjs';
import { EventManager } from "@project-sunbird/ext-framework-server/managers/EventManager";
import { SystemQueue, ISystemQueue } from './../../services/queue';
const INITIAL_TRIGGER = 5000 || 15 * 60 * 1000; // trigger first job after 15 min  
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000; // trigger jobs every 24 hours after first trigger
const DB_NAME = 'perf_log';
const LAST_PERF_SYNC_KEY = 'LAST_PERF_SYNC_TIME';
const REQUIRED_SYSTEM_QUEUE_TASK = ["IMPORT", "DOWNLOAD"];
const DEFAULT_LAST_SYNC_TIME = 1585282913052;
@Singleton
export class PerfLogger {
    @Inject private dbSDK: DataBaseSDK;
    @Inject private settingSDK: SettingSDK;
    constructor() {
        timer(INITIAL_TRIGGER, DAY_IN_MILLISECONDS).subscribe(this.handleTimerEvent.bind(this))
        EventManager.subscribe(SystemQueue.taskCompleteEvent, (data: ISystemQueue) => { // this should be moved to openrap-sunbirded-plugin
            if(!_.includes(REQUIRED_SYSTEM_QUEUE_TASK, data.type)){
                return;
            }
            this.log({
                type: data.type,
                time: data.runTime,
                metaData: data.metaData
              });
        });
    }
    private async handleTimerEvent(triggerCount) {
        console.debug(`========> aggregateLogs triggered: count - ${triggerCount} <========`);
        try {
            await this.aggregateLogs();
            console.debug(`========> aggregateLogs completed for count - ${triggerCount} <========`);
        } catch (error) {
            console.error(`========> aggregateLogs failed for count - ${triggerCount} <========`, error);
        }
    }
    private async aggregateLogs() {
        const lastSyncTime = await this.settingSDK.get(LAST_PERF_SYNC_KEY).catch(error => undefined);
        const startTime = lastSyncTime ? this.getStartAndEndEpochTime(lastSyncTime + 1).startTime
            : this.getStartAndEndEpochTime(DEFAULT_LAST_SYNC_TIME).startTime;
        const endTime = this.getStartAndEndEpochTime().endTime;
        const logIterator = this.getAsyncIterator({startTime, endTime});
        let count = 0;
        for await (const log of logIterator) {
            count++;
            // console.debug("========> ", log);
        }
        console.debug("=====================> perf_log processed <============================", lastSyncTime, count);
    }
    private getAsyncIterator({startTime, endTime}){
        const that = this;
        const genFunc = async function* () {
            let lastProcessedContent: any = {};
            while(true) {
                let logs = await that.getLogsFromDB({startTime, endTime});
                const lastProcessedContentIndex = _.findIndex(logs, { _id: lastProcessedContent._id});
                console.log('lastProcessedContentIndex', lastProcessedContentIndex);
                if (lastProcessedContentIndex !== -1) {
                    logs = logs.slice(lastProcessedContentIndex + 1);
                }
                console.log('logs after splice', logs);
                if(!logs.length){
                    return; // terminates generator 
                }
                for (const log of logs) {
                    yield log
                }
                lastProcessedContent = logs[logs.length - 1];
                startTime = lastProcessedContent.createdOn;
            }
        }
        return {
            [Symbol.asyncIterator]: genFunc
        }
    }
    private async getLogsFromDB({startTime, endTime}){
        console.debug("=====================> getLogsFromDB called with <============================", startTime, endTime);
        const query = {
            selector: {
                createdOn: {
                    "$gte": startTime,
                    "$lte": endTime
                }
            },
            limit: 2,
            sort: ['createdOn']
        }
        return this.dbSDK.find(DB_NAME, query).then(data => data.docs);
    }
    private getStartAndEndEpochTime(dateInEpoch = Date.now()): {startTime: number, endTime: number}{
        const start = new Date(dateInEpoch);
        start.setHours(0,0,0,0);
        const end = new Date(dateInEpoch);
        end.setHours(23,59,59,999);
        return {
            startTime: start.getTime(),
            endTime: end.getTime()
        }
    }
    public log<T>(logData: IPerfLog<T>){
        if(!logData.createdOn){
            logData.createdOn = Date.now();
        }
        this.dbSDK.insertDoc(DB_NAME, logData).catch(error => {
            logger.error("perf_log data insertion error", error);
        });
        console.debug("=====================> logging perf log <============================", logData, this.getStartAndEndEpochTime());
    }
}
