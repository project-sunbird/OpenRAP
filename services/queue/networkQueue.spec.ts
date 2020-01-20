import { NetworkQueue } from './networkQueue';
const chai = require('chai'), spies = require('chai-spies');
chai.use(spies);
const spy = chai.spy.sandbox();
const expect = chai.expect;
import {queueListData, errorEvent} from './networkQueue.spec.data';

describe('NetworkQueue', async () => {
  let networkQueue;
  before(async () => {
    networkQueue = new NetworkQueue();
    process.env.DATABASE_PATH = __dirname;
  });
  it.only('should call add method', async () => {
    spy.on(networkQueue, 'enQueue', data => Promise.resolve('123'));
    let read = spy.on(networkQueue, 'read');
    const data = await networkQueue.add({});
    expect(data).to.be.equal('123');
    expect(read).to.have.been.called();
  });
  it.only('should call read method when internet is available', async () => {
    networkQueue.queueInProgress = false;
    spy.on(networkQueue.networkSDK, 'isInternetAvailable', data => Promise.resolve(true));
    spy.on(networkQueue, 'getByQuery', data => Promise.resolve([{id: '123', data: {}}]));
    let execute = spy.on(networkQueue, 'execute');
    const data = await networkQueue.read();
    expect(execute).to.have.been.called();
  });
  it.only('should call read method when internet is not available execute method should not get called', async () => {
    networkQueue.queueInProgress = false;
    spy.on(networkQueue.networkSDK, 'isInternetAvailable', data => Promise.resolve(false));
    spy.on(networkQueue, 'getByQuery', data => Promise.resolve([{id: '123', data: {}}]));
    let execute = spy.on(networkQueue, 'execute');
    await networkQueue.read();
    expect(execute).to.not.have.been.called();
  });
  it.only('when queue is in progress, execute method should not get called', async () => {
    networkQueue.queueInProgress = true;
    spy.on(networkQueue.networkSDK, 'isInternetAvailable', data => Promise.resolve(true));
    spy.on(networkQueue, 'getByQuery', data => Promise.resolve([{id: '123', data: {}}]));
    let execute = spy.on(networkQueue, 'execute');
    await networkQueue.read();
    expect(execute).to.not.have.been.called();
  });
  it.only('when queueData is empty, execute method should not get called', async () => {
    networkQueue.queueInProgress = false;
    spy.on(networkQueue.networkSDK, 'isInternetAvailable', data => Promise.resolve(true));
    spy.on(networkQueue, 'getByQuery', data => Promise.resolve([]));
    let execute = spy.on(networkQueue, 'execute');
    await networkQueue.read();
    expect(execute).to.not.have.been.called();
  });
  it.only('call execute method', async () => {
    networkQueue.running = 1;
    networkQueue.concurrency = 2;
    networkQueue.queueList = queueListData;
    let makeHTTPCall = spy.on(networkQueue, 'makeHTTPCall', data => Promise.resolve({data:{responseCode: 'success'}}));
    await networkQueue.execute();
    expect(networkQueue.running).to.be.equal(2);
    expect(makeHTTPCall).to.have.been.called();
  });
  it.only('call execute logTelemetryError', async () => {
    const telemetryInstance = spy.on(networkQueue.telemetryInstance, 'error', data => Promise.resolve({}));
    networkQueue.logTelemetryError({stack: 'stack'});
    expect(telemetryInstance).to.have.been.called.with(errorEvent);
  });
  afterEach(async () => {
    spy.restore();
  })

})