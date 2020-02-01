const MS_PER_SEC = 1000;
import { logger } from "./loggerService";
import * as _ from "lodash";

export function logSync(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalFunction = descriptor.value;

  descriptor.value = function (...args: any[]) {
    if(_.get(logger, 'level.levelStr') !== 'ALL'){
      return originalFunction.apply(this, args);
    }
    const startHrTime = process.hrtime();
    logger.debug(`${propertyKey} called with: ${args.join(", ")}`);
    try {
      const result = originalFunction.apply(this, args);
      const diff = process.hrtime(startHrTime);
      const endTime = diff[0] * MS_PER_SEC + diff[1];
      logger.debug(`${propertyKey} returned with: ${result}. Took ${endTime} milliseconds`);
      return result;
    } catch(err) {
      const diff = process.hrtime(startHrTime);
      const endTime = diff[0] * MS_PER_SEC + diff[1];
      logger.debug(`${propertyKey} error-ed with message: ${err.message}.`);
      throw err;
    }
  }
}

export function logAsync(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalFunction = descriptor.value;
  // accept log level
  descriptor.value = function (...args: any[]) {
    if(_.get(logger, 'level.levelStr') !== 'ALL'){
      console.log('skipping logging');
      return originalFunction.apply(this, args);
    }
    const startHrTime = process.hrtime();
    let endTime;
    logger.debug(`--AOP-- ${propertyKey} called with: ${args.join(", ")}`);
    return new Promise((resolve, reject) => {
      originalFunction.apply(this, args).then(result => {
        const diff = process.hrtime(startHrTime);
        endTime = diff[0] * MS_PER_SEC + diff[1];
        logger.debug(`--AOP-- ${propertyKey} returned with: ${result}. endTime`);
        resolve(result);
      })
      .catch((err) => {
        const diff = process.hrtime(startHrTime);
        endTime = diff[0] * MS_PER_SEC + diff[1];
        logger.debug(`--AOP-- ${propertyKey} error-ed with message: ${err.message || err}.`);
        reject(err);
      });
    })
  }
}
