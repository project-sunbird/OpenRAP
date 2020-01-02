import { Singleton } from "typescript-ioc";
import * as _ from "lodash";
import { Inject } from "typescript-ioc";
import { DataBaseSDK } from "../../sdks/DataBaseSDK";
import { ISystemQueue } from './IQueue';
import { logger } from "@project-sunbird/ext-framework-server/logger";
import uuid = require("uuid");
import { Subject, Observer } from "rxjs";
import { debounceTime } from "rxjs/operators";

@Singleton 
  export class SystemQueue {
    @Inject private dbSDK: DataBaseSDK;
    private dbName = 'system_queue';
    private registeredTasks: { [task: string]: RegisteredTasks } = {};
    private runningTasks: IRunningTasks[] =  [];
    private lockTaskExecuter = false;
    private config = { // setting default config
      concurrency: 1,
      concurrencyLevel: ConcurrencyLevel.task // runs one task at a time for each type of task per plugin
    };
    constructor() {}
    public async init(config: Config) {
      // this.config = config; TODO: support configurable concurrency
      const {docs} = await this.dbSDK.find(this.dbName, { selector: { status: SystemQueueStatus.inProgress} })
      .catch((err) => {
        logger.log("reconcile error while fetching inProgress content from DB", err.message);
        return { docs: [] };
      });
      logger.info("length of inProgress jobs found while reconcile", docs.length);
      if (docs.length) {
        const updateQuery: ISystemQueue[] = _.map(docs, (job: ISystemQueue) => {
          job.status = SystemQueueStatus.reconcile;
          return job;
        });
        await this.dbSDK.bulkDocs(this.dbName, updateQuery)
          .catch((err) => logger.log("reconcile error while updating status to DB", err.message));
      }
      this.executeNextTask();
    }
    public registerTask(plugin: string, type: string, taskHandler: TaskExecuter, supportedActions: string[]){
      if(this.registeredTasks[`${plugin}_${type}`]){
        logger.warn('SystemQueue is overriding already registered Task for', `${plugin} ${type}`, 'with new handler', taskHandler);
      }
      this.registeredTasks[`${plugin}_${type}`] = {
        plugin,
        type,
        taskHandler,
        supportedActions
      };
    }
    public async addTask(plugin: string, tasks: QueueReq[] | QueueReq): Promise<string[] | SystemQueueError> {
      if(_.isEmpty(tasks)){
        throw {
          code: "TASK_DATA_MISSING",
          status: 400,
          message: "Task data is missing or empty"
        }
      }
      tasks = _.isArray(tasks) ? tasks : [tasks]
      const queueData = tasks.map(task => ({
        ...task,
        _id: uuid(),
        createdOn: Date.now(),
        updatedOn: Date.now(),
        status: SystemQueueStatus.inQueue,
        progress: 0,
        plugin,
        priority: 1,
        isActive: true,
      }));
      await this.dbSDK.bulkDocs(this.dbName, queueData)
      .catch((err) => logger.error("SystemQueue, Error while adding task in db", err.message));
      this.executeNextTask();
      return queueData.map(({_id}) => _id);
    }
    private async executeNextTask(){
      if(this.lockTaskExecuter){ // prevent picking of same task more than once(for handling race condition)
        return;
      }
      try {
        this.lockTaskExecuter = true;
        const fetchQuery = [];
        let groupedRunningTask = _.groupBy(this.runningTasks, (task) => `${task.plugin}_${task.type}`)
        _.forIn(this.registeredTasks, (value, key) => {
          if(_.get(groupedRunningTask[key], 'length') <= this.config.concurrencyLevel){
            fetchQuery.push({plugin: value.plugin, task: value.type});
          }
        });
        if(!fetchQuery.length){
          return;
        }
        const selector = {
          isActive: true,
          plugin: { $in: fetchQuery.map(data => data.plugin) },
          type: { $in: fetchQuery.map(data => data.type) }
        }
        const { docs } = await this.dbSDK.find(this.dbName, { selector: selector, sort: ["createdOn"] })
        .catch((err) => {
          logger.error("Error while fetching queued jobs in pickNextTask", err.message);
          return { docs: [] };
        });
        groupedRunningTask = _.groupBy(this.runningTasks, (task) => `${task.plugin}_${task.type}`);

      } catch(err) {
        logger.error("Error while executing task", err.message);
      }
      this.lockTaskExecuter = false;
      // invoke task handler by passing data and callback
      // push ref of task handler to running task 
    }
    private getTaskSyncFun(taskData: ISystemQueue): Subject<ISystemQueue> {
      const syncData$ = new Subject<ISystemQueue>();
      const subscription = syncData$.pipe(debounceTime(500))
      .subscribe((data) => {
        // update progress to db
      }, error => {
        // update progress to db
      });
      return syncData$;
    }
    private getTaskObserver(queueCopy: ISystemQueue, syncFun: Subject<ISystemQueue>): Observer<ISystemQueue> {
      return {
        next(data: ISystemQueue){
          queueCopy = data;
          syncFun.next(queueCopy);
        },
        error(err: SystemQueueError){
          queueCopy.status = SystemQueueStatus.failed;
          queueCopy.failedCode = err.code;
          queueCopy.failedCode = err.code;
          queueCopy.isActive = false;
          syncFun.error(queueCopy);
          // remove task from running task
          this.pickNextTask();
        },
        complete(){
          queueCopy.isActive = false;
          queueCopy.status = SystemQueueStatus.completed;
          syncFun.next(queueCopy);
          syncFun.complete();
          // remove task from running task
          this.pickNextTask();
        }
      }
    }
    public async remove(id: string){ // not needed

    }
    public async query(query: SystemQueueQuery){

    }
    public async pause(id: string){

    }
    public async resume(id: string){

    }
    public async cancel(id: string){

    }
    public async retry(id: string){

    }
}

interface IRunningTasks {
  _id: ISystemQueue['_id'];
  type: ISystemQueue['type'];
  plugin: ISystemQueue['plugin'];
  taskExecuterRef: TaskExecuter;
  syncFunc: any;
}

export interface TaskExecuter {
  start(ISystemQueue: ISystemQueue, cb: Function): Promise<boolean | SystemQueueError>;
  status(): ISystemQueue;
  pause?(): Promise<boolean | SystemQueueError>;
  resume?(ISystemQueue): Promise<boolean | SystemQueueError>;
  cancel?(): Promise<boolean | SystemQueueError>;
  retry?(ISystemQueue): Promise<boolean | SystemQueueError>;
}

export interface QueueReq {
  type: ISystemQueue['type'];
  name: ISystemQueue['name'];
  group: ISystemQueue['group']; // ex: content_manager, telemetry etc
  additionalInfo: ISystemQueue['additionalInfo']; // any data required for 
  indexField: ISystemQueue['indexField']; // ex: ecar path for import, content identifier for download/delete
}

export interface SystemQueueError {
  code: string;
  status: number;
  message: string;
}

export interface SystemQueueQuery {
  _id?: ISystemQueue['_id'];
  type?: ISystemQueue['type'][];
  group?: ISystemQueue['group'];
  indexField?: ISystemQueue['indexField'];
}
export enum SystemQueueStatus {
  reconcile = "reconcile",
  resume = "resume",
  inQueue = "inQueue",
  inProgress = "inProgress",
  pausing = "pausing",
  paused = "paused",
  canceling = "canceling",
  canceled = "canceled",
  completed = "completed",
  failed = "failed",
}

export interface TaskHandler {

}
export enum ConcurrencyLevel {
  app,
  plugin,
  task
}
export interface Config {
  concurrency: number;
  concurrencyLevel: ConcurrencyLevel
}
export interface RegisteredTasks {
  plugin: string;
  type: string;
  taskHandler: TaskExecuter;
  supportedActions: any;
}