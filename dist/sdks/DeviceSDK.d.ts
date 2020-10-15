export default class DeviceSDK {
    private settingSDK;
    private systemSDK;
    private databaseSdk;
    private config;
    private apiKey;
    private deviceRegistryV1APIPath;
    private deviceRegistryV2APIPath;
    initialize(config: IConfig): void;
    register(): Promise<void>;
    getToken(deviceId?: string): Promise<string>;
    getTokenFromFallBackURL(options: any, fallBackURL?: string): Promise<string>;
    getBearerToken(options: any): Promise<string>;
}
export interface IConfig {
    key: string;
}
