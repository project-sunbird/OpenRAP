import * as _ from 'lodash';
import { logger } from "./loggerService";
const NS_PER_SEC = 1e9;
interface IClassLoggerOptions extends IMethodLoggerOptions {
  logMethods?: string[];
}
interface IMethodLoggerOptions {
  logLevel: 'info' | 'debug' | 'error' | 'warn' | 'trace';
  logTime: boolean;
}
const defaultMethodLoggerOptions: IMethodLoggerOptions = {
  logLevel: 'info',
  logTime: false
}
export function ClassLogger(classLoggerOptions: IClassLoggerOptions = defaultMethodLoggerOptions) {
  return function(constructor) {
    console.log("==============> classDecorator called for <=========================", constructor.prototype);
    _.keys(constructor.prototype).filter(
      (methodName: string) => !classLoggerOptions.logMethods || _.includes(classLoggerOptions.logMethods, methodName)
      // (methodName: string) => classLoggerOptions.logMethods && classLoggerOptions.logMethods.includes(methodName)
    )
    .forEach(methodName => {
      const originalMethod = constructor.prototype[methodName];
      console.log("==============> classDecorator warping method <=========================", methodName);
      constructor.prototype[methodName] = wrapMethodWithLogAsync(originalMethod, methodName, constructor.name, {
        logLevel: classLoggerOptions.logLevel, 
        logTime: classLoggerOptions.logTime
      });
    });
  }
}
export function MethodLogger(methodLogOption: IMethodLoggerOptions = defaultMethodLoggerOptions): any {
  return function (classRef: any, methodName: string, methodRef: PropertyDescriptor) {
    methodRef.value = wrapMethodWithLogAsync(methodRef.value, methodName, classRef.constructor.name, methodLogOption);
  };
}
function wrapMethodWithLog(method: Function, methodName: string, className: string, options: IMethodLoggerOptions): Function {
  return function(...args) {
    const startHrTime = process.hrtime();
    const loggerMethod = logger[options.logLevel] || logger.debug
    try {
      logger[options.logLevel](`${className}.${methodName} called with: `, ...args);
      const result = method.apply(this, args);
      const diff = process.hrtime(startHrTime);
      const endTime = (diff[0] * NS_PER_SEC + diff[1]) / NS_PER_SEC;
      logger[options.logLevel](`===> ${className}.${methodName} returned with: `, result, `. Took ${endTime} sec`);
      return result;
    } catch(error) {
      const diff = process.hrtime(startHrTime);
      const endTime = (diff[0] * NS_PER_SEC + diff[1]) / NS_PER_SEC;
      logger[options.logLevel](`===> ${className}.${methodName} failed with: `, error, `. Took ${endTime} sec`);
      throw error;
    }
  };
};
function wrapMethodWithLogAsync(method: Function, methodName: string, className: string, options: IMethodLoggerOptions): Function {
  return async function(...args) {
    const startHrTime = process.hrtime();
    const loggerMethod = logger[options.logLevel] || logger.info
    try {
      logger[options.logLevel](`${className}.${methodName} called with: `, ...args);
      const result = await method.apply(this, args);
      const diff = process.hrtime(startHrTime);
      const endTime = (diff[0] * NS_PER_SEC + diff[1]) / NS_PER_SEC;
      logger[options.logLevel](`${className}.${methodName} returned with: `, result, `. Took ${endTime} sec`);
      return result;
    } catch(error) {
      const diff = process.hrtime(startHrTime);
      const endTime = (diff[0] * NS_PER_SEC + diff[1]) / NS_PER_SEC;
      logger[options.logLevel](`${className}.${methodName} failed with: `, error, `. Took ${endTime} sec`);
      throw error;
    }
  };
};

