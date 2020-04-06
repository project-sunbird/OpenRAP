import { Singleton } from "typescript-ioc";
import * as _ from "lodash";
import { Inject } from "typescript-ioc";
import { DataBaseSDK } from "../../sdks/DataBaseSDK";
import { logger } from "@project-sunbird/logger";
const uuid = require("uuid");
import { TelemetryInstance } from './../telemetry/telemetryInstance';
import { IPerfLog } from './IPerfLog';

@Singleton
export class PerfLogger {

    public log(IPerfLog){

    }
    public initialize(startAfter: number, interval: number){

    }

}