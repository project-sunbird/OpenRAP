export default class DeviceSDK {
    private settingSDK;
    private systemSDK;
    private databaseSdk;
    private config;
    private apiKey;
    private v1_api_path;
    private v2_api_path;
    initialize(config: IConfig): void;
    register(): Promise<void>;
    getToken(deviceId?: string): Promise<string>;
    getTokenFromFallBackURL(options: any, fallBackURL?: string): Promise<string>;
    getBearerToken(options: any): Promise<string>;
}
export interface IConfig {
    key: string;
}
