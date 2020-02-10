/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */
import { PluginConfig } from "./../interfaces";
import SettingSDK from "./../sdks/SettingSDK";
import FileSDK from "./../sdks/FileSDK";
import SystemSDK from "./../sdks/SystemSDK";
import TelemetrySDK from "./../sdks/TelemetrySDK";
import { UserSDK } from "./../sdks/UserSDK";
import { TicketSDK } from "./../sdks/TicketSDK";
import { DownloadSDK } from "./../sdks/DownloadSDK";
import { SystemQueue, TaskExecuter, SystemQueueReq, SystemQueueQuery, ISystemQueue } from './../services/queue';
export { ITaskExecuter, SystemQueueQuery, ISystemQueue, SystemQueueReq, SystemQueueStatus } from "./../services/queue";
declare class ContainerAPI {
    userSDK: UserSDK;
    ticketSDK: TicketSDK;
    systemQueue: SystemQueue;
    downloadSDK: DownloadSDK;
    bootstrap(): Promise<void>;
    register(pluginId: string, pluginInfo: PluginConfig): Promise<void>;
    getSettingSDKInstance(pluginId: string): SettingSDK;
    getFileSDKInstance(pluginId: string): FileSDK;
    getDownloadSdkInstance(): DownloadSDK;
    getNetworkStatus(url?: string): Promise<boolean>;
    getSystemSDKInstance(pluginId: string): SystemSDK;
    getTelemetrySDKInstance(): TelemetrySDK;
    getUserSdkInstance(): UserSDK;
    getTicketSdkInstance(): TicketSDK;
    initializeSystemQueue(): void;
    getSystemQueueInstance(pluginId: string): ISystemQueueInstance;
}
export interface ISystemQueueInstance {
    register(type: string, taskExecuter: TaskExecuter): any;
    add(tasks: SystemQueueReq[] | SystemQueueReq): any;
    query(query: SystemQueueQuery, sort?: any): any;
    pause(_id: string): any;
    resume(_id: string): any;
    cancel(_id: string): any;
    retry(_id: string): any;
    migrate(tasks: ISystemQueue[]): any;
}
export declare const containerAPI: ContainerAPI;
