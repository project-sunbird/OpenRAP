// import { configure, getLogger } from 'log4js';
const log4js = require('log4js');
import * as path from 'path';
const logger = log4js.getLogger();
logger.level = 'off';
type loggerLevels = 'all' | 'trace' | 'fatal' | 'error' | 'off' | 'info' | 'warn' | 'debug'
const defaultConfig = {
  basePath: path.join(__dirname, './../../../../../'), // default to parent root directory
  logLevel: "debug"
}
function initLogger(config = defaultConfig) {
  log4js.configure({
    "appenders": {
      "access": {
        "type": "dateFile",
        "filename": path.join(config.basePath, "log", "access.log"),
        "pattern": "-yyyy-MM-dd",
        "category": "http",
        "maxLogSize": 10485760, // 10MB
        "backups": 3,
        "compress": true
      },
      "app": {
        "type": "file",
        "filename": path.join(config.basePath, "log", "app.log"),
        "maxLogSize": 10485760, // 10MB
        "backups": 3,
        "compress": true
      },
      "errorFile": {
        "type": "file",
        "filename": path.join(config.basePath, "log", "errors.log"),
        "maxLogSize": 10485760, // 10MB
        "backups": 3,
        "compress": true
      },
      "errors": {
        "type": "logLevelFilter",
        "level": "ERROR",
        "appender": "errorFile"
      },
      "console": {
        "type": "console",
        "layout": {
          "type": "coloured"
        }
      }
    },
    "categories": {
      "default": { "appenders": ["app", "errors", "console"], "level": "DEBUG" },
      "http": { "appenders": ["access"], "level": "DEBUG" }
    }
  });
  logger.level = config.logLevel;
}
export { logger, initLogger, loggerLevels };
