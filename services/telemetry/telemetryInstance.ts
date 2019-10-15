import { Singleton, Inject } from "typescript-ioc";
import { TelemetryService } from "./telemetryService";
import { TelemetryConfig } from "./../../interfaces/telemetryConfig";
import { DataBaseSDK } from "./../../sdks/DataBaseSDK";
import * as _ from "lodash";
import uuid = require("uuid");

@Singleton
export class TelemetryInstance extends TelemetryService {
  @Inject
  private databaseSdk: DataBaseSDK;
  sessionId: string;
  constructor() {
    super();
    this.sessionId = uuid.v4();
    let telemetryValidation =
      _.toLower(process.env.TELEMETRY_VALIDATION) === "true" ? true : false;
    let config: TelemetryConfig = {
      pdata: {
        id: process.env.APP_ID,
        ver: process.env.APP_VERSION,
        pid: "desktop.app"
      },
      sid: this.sessionId, // Should be updated whenever user action is not performed for sometime
      env: "container",
      rootOrgId: process.env.ROOT_ORG_ID,
      hashTagId: process.env.ROOT_ORG_HASH_TAG_ID,
      batchSize: 10,
      enableValidation: telemetryValidation,
      runningEnv: "server",
      dispatcher: this.send.bind(this)
    };
    this.init(config);
  }
  send(events): void {
    return this.databaseSdk.bulkDocs("telemetry", events);
  }
}
