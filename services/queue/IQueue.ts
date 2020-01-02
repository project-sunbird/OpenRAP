export interface IQueue {
  _id: string;
  type: string,
  priority: number;
  createdOn: number;
  updatedOn: number;
  additionalInfo?: any;
}

export interface ISystemQueue extends IQueue {
  name: string;
  progress: number;
  group: string;
  plugin: string;
  status: string;
  failedCode?: string;
  isActive: boolean;
  failedReason?: string;
  indexField: string;
}

export interface INetworkQueue extends IQueue {
  baseUrl: string;
  urlPath: string;
  status: string;
  requestHeaders: {};
  requestBody: {};
  authTokenRequired: boolean;
}
