import { Singleton } from "typescript-ioc";
import * as _ from "lodash";
import { Inject } from "typescript-ioc";
import { DataBaseSDK } from "../../sdks/DataBaseSDK";
import SettingSDK from '../../sdks/SettingSDK';
import { logger } from "@project-sunbird/logger";
import { ClassLogger } from "@project-sunbird/logger/decorator";
import { TelemetryInstance } from './../telemetry/telemetryInstance';
import { IPerfLog } from './IPerfLog';
import { timer } from 'rxjs';
import { EventManager } from "@project-sunbird/ext-framework-server/managers/EventManager";
import { SystemQueue, ISystemQueue } from './../../services/queue';

const INITIAL_TRIGGER = 5000 || 15 * 60 * 1000; // trigger first job after 15 min  
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000; // trigger jobs every 24 hours after first trigger
const MONTH_IN_MILLISECONDS = 30 * 24 * 60 * 60 * 1000; // used in archive job to remove logs which are older than last 30 days
const LOG_QUERY_LIMIT = 1000;
const DB_NAME = 'perf_log';
const LAST_PERF_LOG_PROCEEDED_ON = 'LAST_PERF_LOG_PROCEEDED_ON';
const REQUIRED_SYSTEM_QUEUE_TASK = ["IMPORT", "DOWNLOAD"]; // should be moved to openrap-sunbirded-plugin to make it customizable
const DEFAULT_LAST_SYNC_TIME = 1585282913052;

@Singleton
@ClassLogger()
export class PerfLogger {
    @Inject private dbSDK: DataBaseSDK;
    @Inject private settingSDK: SettingSDK;
    constructor() {
        timer(INITIAL_TRIGGER, DAY_IN_MILLISECONDS).subscribe(this.handleTimerEvent.bind(this))
        EventManager.subscribe(SystemQueue.taskCompleteEvent, (data: ISystemQueue) => { // this should be moved to openrap-sunbirded-plugin
            if(!_.includes(REQUIRED_SYSTEM_QUEUE_TASK, data.type)){
                return;
            }
            // TODO: divide time by contentSize
            this.log({
                type: data.type,
                time: data.runTime,
                metaData: data.metaData
              });
        });
    }

    private async aggregateLogs() {
        const lastSyncDateStoredInDB = await this.settingSDK.get(LAST_PERF_LOG_PROCEEDED_ON).catch(error => undefined);
        const lastSyncedDate = _.get(lastSyncDateStoredInDB, 'lastProcessedOn') ? this.getStartAndEndEpochTime(lastSyncDateStoredInDB.lastProcessedOn)
            : this.getStartAndEndEpochTime(DEFAULT_LAST_SYNC_TIME);
        const endDate = this.getStartAndEndEpochTime(); // gives current date start and end epoch time, today logs shouldn't be processed
        let aggregatedLog = {};
        let currentEndTime = this.getStartAndEndEpochTime(lastSyncedDate.endTime + 1).endTime;
        let perfLogs = this.getUnProcessedLogs({startTime: lastSyncedDate.endTime + 1, endTime: endDate.startTime - 1}, LOG_QUERY_LIMIT);

        for await (const log of perfLogs) {
            if(log.createdOn > currentEndTime) {
                await this.generateMetrics(aggregatedLog, currentEndTime);
                aggregatedLog = {};
                currentEndTime = this.getStartAndEndEpochTime(log.createdOn).endTime;
            }
            if(!aggregatedLog[log.type]){
                aggregatedLog[log.type] = [];
            }
            aggregatedLog[log.type].push(log);
        }
        this.generateMetrics(aggregatedLog, currentEndTime); // generate metrics for last day
    }
    private async generateMetrics(aggregatedLog, currentEndTime) {
        if(_.isEmpty(aggregatedLog)) {
            return;
        }
        // TODO: aggregate logs based on type and log metric event
        await this.updateLastSyncDate(currentEndTime); // update last processed time
    }
    private async updateLastSyncDate(currentEndTime){
        await this.settingSDK.put(LAST_PERF_LOG_PROCEEDED_ON, {lastProcessedOn: currentEndTime}); // should be un-commented
    }
    private getUnProcessedLogs({startTime, endTime}, limit){
        const that = this;
        const generatorFunction = async function* () {
            let lastProcessedContent: any = {};
            while(true) {
                let logs = await that.getLogsFromDB({startTime, endTime}, {limit});
                const lastProcessedContentIndex = _.findIndex(logs, { _id: lastProcessedContent._id});
                if (lastProcessedContentIndex !== -1) {
                    logs = logs.slice(lastProcessedContentIndex + 1); // slice off already processed data
                }
                if(!logs.length){
                    return; // terminates generator 
                }
                for (const log of logs) {
                    yield log;
                }
                lastProcessedContent = logs[logs.length - 1]; // used to remove already processed data
                startTime = lastProcessedContent.createdOn; // update start time with last fetched rows createdOn
            }
        }
        return {
            [Symbol.asyncIterator]: generatorFunction
        }
    }
    private async getLogsFromDB<T>({startTime, endTime}: {startTime: number, endTime: number},
            {fields, limit}: { fields?: string[], limit?: number}): Promise<IPerfLog<T>[]> {
        const query = {
            selector: {
                createdOn: {
                    "$gte": startTime,
                    "$lte": endTime
                }
            },
            sort: ['createdOn']
        }
        if(limit){
            query['limit'] = limit;
        }
        if (fields) {
            query['fields'] = fields;
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
    }
    private async handleTimerEvent(triggerCount) {
        try {
            await this.aggregateLogs();
            await this.archiveOldLogs();
        } catch (error) {
            logger.error(`========> aggregateLogs failed for count - ${triggerCount} <========`, error);
        }
    }
    private async archiveOldLogs(){

        let endDate = this.getStartAndEndEpochTime().startTime - 1 * MONTH_IN_MILLISECONDS;
        let archiveLogs = await this.getLogsFromDB({startTime: 0, endTime: endDate}, {fields: ['_id', '_rev']});

        if(!archiveLogs || !archiveLogs.length){
            return;
        }
        const toBeDeleted = archiveLogs.map((data: any) => ({ _id: data._id, _rev: data._rev, _deleted: true }));
        await this.dbSDK.bulkDocs(DB_NAME, toBeDeleted);
    }
}
