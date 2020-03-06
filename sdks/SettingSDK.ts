import { DataBaseSDK } from "./DataBaseSDK";
import { hash } from "./../utils";
import { Inject } from "typescript-ioc";

/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */

let dbName = "settings";

export default class SettingSDK {
  @Inject
  private dbSDK: DataBaseSDK;

  constructor(public pluginId?: string) {}
  /*
   * Method to put the setting
   * @param key String - The key for the config/setting prefixed with pluginId Hash string
   * @param value Object - The value of the setting
   */
  put = async (key: string, value: object): Promise<boolean> => {
    let keyName = this.pluginId ? `${hash(this.pluginId)}_${key}` : key;
    await this.dbSDK.upsertDoc(dbName, keyName, value);
    return true;
  };

  /*
   * Method to get the setting
   * @param key String - The key for the config/setting
   * @return value Object
   */
  get = async (key: string): Promise<object> => {
    let keyName = this.pluginId ? `${hash(this.pluginId)}_${key}` : key;
    let setting = await this.dbSDK.getDoc(dbName, keyName);
    delete setting["_id"];
    delete setting["_rev"];
    return Promise.resolve(setting);
  };
}
