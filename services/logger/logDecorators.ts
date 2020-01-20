const MS_PER_SEC = 1000;
import { logger } from "./loggerService";

export function logSync(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalFunction = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const startHrTime = process.hrtime();
    logger.info(`${propertyKey} called with: ${args.join(", ")}`);
    try {
      const result = originalFunction.apply(this, args);
      const diff = process.hrtime(startHrTime);
      const endTime = diff[0] * MS_PER_SEC + diff[1];
      logger.info(`${propertyKey} returned with: ${result}. Took ${endTime} milliseconds`);
      return result;
    } catch(err) {
      const diff = process.hrtime(startHrTime);
      const endTime = diff[0] * MS_PER_SEC + diff[1];
      logger.info(`${propertyKey} error-ed with message: ${err.message}. Took ${endTime} milliseconds`);
      throw err;
    }
  }
}

export function logAsync(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalFunction = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const startHrTime = process.hrtime();
    let endTime;
    logger.info(`${propertyKey} called with: ${args.join(", ")}`);
    const result = await originalFunction.apply(this, args)
    .catch((err) => {
      const diff = process.hrtime(startHrTime);
      endTime = diff[0] * MS_PER_SEC + diff[1];
      logger.error(`${propertyKey} error-ed with message: ${err.message || err}. Took ${endTime} milliseconds`);
      throw err;
    });
    const diff = process.hrtime(startHrTime);
    endTime = diff[0] * MS_PER_SEC + diff[1];
    logger.info(`${propertyKey} returned with: ${result}. Took ${endTime} milliseconds`);
    return result;
  }
}
