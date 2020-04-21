"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_ioc_1 = require("typescript-ioc");
const _ = __importStar(require("lodash"));
const typescript_ioc_2 = require("typescript-ioc");
const DataBaseSDK_1 = require("../../sdks/DataBaseSDK");
const SettingSDK_1 = __importDefault(require("../../sdks/SettingSDK"));
const logger_1 = require("@project-sunbird/logger");
const rxjs_1 = require("rxjs");
const telemetryInstance_1 = require("./../telemetry/telemetryInstance");
const INITIAL_TRIGGER = 15 * 60 * 1000; // trigger first job after 15 min  
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000; // trigger jobs every 24 hours after first trigger
const MONTH_IN_MILLISECONDS = 30 * 24 * 60 * 60 * 1000; // used in archive job to remove logs which are older than last 30 days
const LOG_QUERY_LIMIT = 1000;
const DB_NAME = 'perf_log';
const LAST_PERF_LOG_PROCEEDED_ON = 'LAST_PERF_LOG_PROCEEDED_ON';
const DEFAULT_LAST_SYNC_TIME = 1585282913052; // used when setting sdk return no data
const system = "DesktopApp";
const subsystem = "DesktopApp";
let PerfLogger = class PerfLogger {
    initialize(initial_trigger = INITIAL_TRIGGER, scheduled_trigger = DAY_IN_MILLISECONDS) {
        rxjs_1.timer(initial_trigger, scheduled_trigger).subscribe(this.handleTimerEvent.bind(this)); // triggers aggregate job initial after initial_trigger and every 24 hours after initial trigger
    }
    handleTimerEvent(triggerCount) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.aggregateLogs();
                yield this.archiveOldLogs();
            }
            catch (error) {
                logger_1.logger.error(`========> aggregateLogs failed for count - ${triggerCount} <========`, error);
            }
        });
    }
    aggregateLogs() {
        return __awaiter(this, void 0, void 0, function* () {
            var e_1, _a;
            const lastProcessedDateInDB = yield this.settingSDK.get(LAST_PERF_LOG_PROCEEDED_ON).catch(error => undefined);
            const lastProcessedDate = _.get(lastProcessedDateInDB, 'lastProcessedOn') ? this.getStartAndEndEpochTime(lastProcessedDateInDB.lastProcessedOn)
                : this.getStartAndEndEpochTime(DEFAULT_LAST_SYNC_TIME);
            const endDate = this.getStartAndEndEpochTime(); // gives current date start and end epoch time, today logs shouldn't be processed
            let aggregatedLog = {};
            let currentEndTime = this.getStartAndEndEpochTime(lastProcessedDate.endTime + 1).endTime;
            let perfLogsIterator = this.getUnProcessedLogsIterator({ startTime: lastProcessedDate.endTime + 1, endTime: endDate.startTime - 1 }, LOG_QUERY_LIMIT);
            try {
                for (var perfLogsIterator_1 = __asyncValues(perfLogsIterator), perfLogsIterator_1_1; perfLogsIterator_1_1 = yield perfLogsIterator_1.next(), !perfLogsIterator_1_1.done;) {
                    const log = perfLogsIterator_1_1.value;
                    if (log.createdOn > currentEndTime) {
                        this.generateTelemetryMetrics(aggregatedLog, currentEndTime);
                        aggregatedLog = {};
                        currentEndTime = this.getStartAndEndEpochTime(log.createdOn).endTime;
                    }
                    if (!aggregatedLog[log.type]) {
                        aggregatedLog[log.type] = [];
                    }
                    aggregatedLog[log.type].push(log);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (perfLogsIterator_1_1 && !perfLogsIterator_1_1.done && (_a = perfLogsIterator_1.return)) yield _a.call(perfLogsIterator_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            this.generateTelemetryMetrics(aggregatedLog, currentEndTime); // generate metrics for last day
            yield this.updateLastSyncDate(currentEndTime); // update last processed time
        });
    }
    getUnProcessedLogsIterator({ startTime, endTime }, limit) {
        const that = this;
        const generatorFunction = function () {
            return __asyncGenerator(this, arguments, function* () {
                let lastProcessedContent = {};
                while (true) {
                    let logs = yield __await(that.getLogsFromDB({ startTime, endTime }, { limit }));
                    const lastProcessedContentIndex = _.findIndex(logs, { _id: lastProcessedContent._id });
                    if (lastProcessedContentIndex !== -1) {
                        logs = logs.slice(lastProcessedContentIndex + 1); // slice off already processed data
                    }
                    if (!logs.length) {
                        return yield __await(void 0); // terminates generator 
                    }
                    for (const log of logs) {
                        yield yield __await(log);
                    }
                    lastProcessedContent = logs[logs.length - 1]; // used to remove already processed data
                    startTime = lastProcessedContent.createdOn; // update start time with last fetched rows createdOn
                }
            });
        };
        return {
            [Symbol.asyncIterator]: generatorFunction
        };
    }
    generateTelemetryMetrics(aggregatedLog, currentEndTime) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_.isEmpty(aggregatedLog)) {
                return;
            }
            const metrics = [];
            _.forIn(aggregatedLog, (value, key) => {
                const metricKey = _.upperFirst(_.camelCase(key));
                const metricsRaw = this.findMinMaxAvg(value.map(ele => ele.time));
                metrics.push({
                    metric: `min${metricKey}Time`,
                    value: metricsRaw.min
                });
                metrics.push({
                    metric: `max${metricKey}Time`,
                    value: metricsRaw.max
                });
                metrics.push({
                    metric: `avg${metricKey}Time`,
                    value: metricsRaw.avg
                });
                metrics.push({
                    metric: `total${metricKey}S`,
                    value: value.length
                });
            });
            metrics.push({
                metric: 'createdDate',
                value: currentEndTime
            });
            const telemetryEvent = {
                context: {
                    env: 'DesktopApp',
                },
                edata: {
                    system,
                    subsystem,
                    metrics
                },
            };
            this.telemetryInstance.metrics(telemetryEvent);
        });
    }
    findMinMaxAvg(arr = []) {
        let max = arr[0];
        let min = arr[0];
        let sum = 0;
        arr.forEach((value) => {
            if (value > max)
                max = value;
            if (value < min)
                min = value;
            sum += value;
        });
        let avg = sum / arr.length;
        return { max, min, avg };
    }
    updateLastSyncDate(currentEndTime) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.settingSDK.put(LAST_PERF_LOG_PROCEEDED_ON, { lastProcessedOn: currentEndTime }); // should be un-commented
        });
    }
    getLogsFromDB({ startTime, endTime }, { fields, limit }) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = {
                selector: {
                    createdOn: {
                        "$gte": startTime,
                        "$lte": endTime
                    }
                },
                sort: ['createdOn']
            };
            if (limit) {
                query['limit'] = limit;
            }
            if (fields) {
                query['fields'] = fields;
            }
            return this.dbSDK.find(DB_NAME, query).then(data => data.docs);
        });
    }
    getStartAndEndEpochTime(dateInEpoch = Date.now()) {
        const start = new Date(dateInEpoch);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(dateInEpoch);
        end.setUTCHours(23, 59, 59, 999);
        return {
            startTime: start.getTime(),
            endTime: end.getTime()
        };
    }
    log(logData) {
        if (!logData.createdOn) {
            logData.createdOn = Date.now();
        }
        console.log("==========perf_log added===========", logData);
        this.dbSDK.insertDoc(DB_NAME, logData).catch(error => {
            logger_1.logger.error("perf_log data insertion error", error);
        });
    }
    archiveOldLogs() {
        return __awaiter(this, void 0, void 0, function* () {
            let endDate = this.getStartAndEndEpochTime().startTime - 1 * MONTH_IN_MILLISECONDS;
            let archiveLogs = yield this.getLogsFromDB({ startTime: 0, endTime: endDate }, { fields: ['_id', '_rev'] });
            if (!archiveLogs || !archiveLogs.length) {
                return;
            }
            const toBeDeleted = archiveLogs.map((data) => ({ _id: data._id, _rev: data._rev, _deleted: true }));
            yield this.dbSDK.bulkDocs(DB_NAME, toBeDeleted);
        });
    }
};
__decorate([
    typescript_ioc_2.Inject,
    __metadata("design:type", DataBaseSDK_1.DataBaseSDK)
], PerfLogger.prototype, "dbSDK", void 0);
__decorate([
    typescript_ioc_2.Inject,
    __metadata("design:type", SettingSDK_1.default)
], PerfLogger.prototype, "settingSDK", void 0);
__decorate([
    typescript_ioc_2.Inject,
    __metadata("design:type", telemetryInstance_1.TelemetryInstance)
], PerfLogger.prototype, "telemetryInstance", void 0);
PerfLogger = __decorate([
    typescript_ioc_1.Singleton
], PerfLogger);
exports.PerfLogger = PerfLogger;
