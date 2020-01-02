import { Singleton } from "typescript-ioc";
import * as _ from "lodash";
import { Inject } from "typescript-ioc";
import { DataBaseSDK } from "../../sdks/DataBaseSDK";
@Singleton
export class networkQueue {
    @Inject private dbSDK: DataBaseSDK;
    protected dbName = 'network_queue';
    constructor() { 
    }
    enQueue(plugin, data): string{
      return 'id';
    }
    deQueue(){

    }
    pickNext(){
      
    }
}