export interface IQueue {
    _id?: string;
    type: string,
    priority: number;
    createdOn: number;
    updatedOn: number;
    data?: any;
}

export interface ISystemQueue extends IQueue {
  name?: string;
  _rev?: string;
  group: string;
  plugin: string;
  status: SystemQueueStatus;
  failedCode?: string;
  isActive: boolean;
  failedReason?: string;
  indexField: string;
  runTime: number;
  progress: number;
}
export interface INetworkQueue extends IQueue {
    pathToApi: string;
    requestHeaderObj: object;
    requestBody: any;
    bearerToken: boolean;
    subType: string;
    size?: number;
    count?: number;
}

export interface IQuery {
    selector: {
        type: string;
        subType?: string;
    };
    limit?: number;
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
export interface IUpdateQuery {
    updatedOn: number;
}
