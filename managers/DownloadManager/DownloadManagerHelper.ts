/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */
const { SuDScheduler } = require('su-downloader3')
import { Singleton, Inject } from 'typescript-ioc';
import * as _ from 'lodash';
import { logger } from '@project-sunbird/ext-framework-server/logger';
import { STATUS, STATUS_MESSAGE } from './DownloadManager';
import { DataBaseSDK } from '../../sdks/DataBaseSDK';
import { EventManager } from '@project-sunbird/ext-framework-server/managers/EventManager';

@Singleton
export class DownloadManagerHelper {

    @Inject
    private dbSDK: DataBaseSDK;

    private dataBaseName = 'download_queue';

    private suDScheduler;
    constructor() {
        // initialize the su downloader3 schedular
        let options = {
            threads: 1, // TODO: if threads are morethan one the unzip is failing due to partial combined
            throttleRate: 5000,
            timeout: 60000
        }

        let schedulerOptions = {
            autoStart: true,
            maxConcurrentDownloads: 1, //  don't change this which will give db duplicate update errors on progress
            downloadOptions: options
        }
        this.suDScheduler = new SuDScheduler(schedulerOptions)
    }

    queueDownload = (downloadId: string, pluginId: string, locations: object, observer: any): boolean => {
        return this.suDScheduler.queueDownload(downloadId, locations, observer);
    }

    pause = (downloadId: string): boolean => {
        return this.suDScheduler.pauseDownload(downloadId);

    };

    cancel = (downloadId: string): boolean => {
        return this.suDScheduler.killDownload(downloadId);
    };

    pauseAll = (stop: boolean = false): void => {
        this.suDScheduler.pauseAll(stop);
    };

    cancelAll = (): boolean => {
        let flag = false;
        if (!_.isEmpty(this.suDScheduler.taskQueue)) {
            _.forEach(this.suDScheduler.taskQueue, (task) => {
                flag = this.suDScheduler.killDownload(task.key);
            })
        }
        return false;
    };

    taskQueue = () => {
        return this.suDScheduler.taskQueue;
    }

    resumeDownload = () => {
        this.suDScheduler.startQueue();
    }
    downloadObserver = (downloadId: string, docId: string) => {
        return ({
            next: progressInfo => {
                //update the status to In Progress in DB with stats
                this.dbSDK.getDoc(this.dataBaseName, docId).then(doc => {
                    // for initial call we will get the filesize
                    if (_.get(progressInfo, 'filesize')) {
                        doc.files = _.map(doc.files, file => {
                            if (file.id === downloadId) {
                                file.size = _.get(progressInfo, 'filesize')
                            }
                            return file;
                        })
                    }
                    //sub-sequent calls we will get downloaded count
                    if (_.get(progressInfo, 'total.downloaded')) {
                        let downloaded = progressInfo.total.downloaded;
                        doc.files = _.map(doc.files, file => {
                            if (file.id === downloadId) {
                                file.downloaded = downloaded
                                file.size = progressInfo.total.filesize;
                                doc.stats.downloadedSize = progressInfo.total.downloaded;
                                this.dbSDK.updateDoc(this.dataBaseName, docId, {
                                    files: doc.files,
                                    stats: doc.stats,
                                    updatedOn: Date.now();
                                });
                            }
                            return file;
                        })
                    }

                    doc.status = STATUS.InProgress;
                    doc.statusMsg = STATUS_MESSAGE.InProgress;
                    doc.updatedOn = Date.now()
                    delete doc['_rev'];
                    return this.dbSDK.updateDoc(this.dataBaseName, docId, doc);
                }).catch(err => {
                    logger.error('While updating progress in database', err);
                })

            },
            error: e => {
                // generate the telemetry
                // update the status to failed
                this.dbSDK.updateDoc(this.dataBaseName, docId, {
                    status: STATUS.Failed,
                    statusMsg: STATUS_MESSAGE.Failed,
                    updatedOn: Date.now()
                }).then(() => {
                    return this.dbSDK.getDoc(this.dataBaseName, docId)
                }).then(doc => {
                    let pluginId = doc.pluginId;
                    delete doc.pluginId;
                    delete doc.statusMsg;
                    delete doc._rev;
                    doc.id = doc._id;
                    delete doc._id;
                    EventManager.emit(`${pluginId}:download:failed`, doc);
                    logger.error('Error', e, 'context:', JSON.stringify(doc));
                }).catch(e => {
                    logger.error('Error', e, 'context-error:', e, 'docId', docId, 'fileId', downloadId);
                })

                // Emit the event on error
            },
            complete: () => {
                // log the info 
                // generate the telemetry
                // update the status to completed

                this.dbSDK.getDoc(this.dataBaseName, docId).then(async (doc) => {
                    doc.stats.downloadedFiles = doc.stats.downloadedFiles + 1;
                    if (_.find(doc.files, { 'id': downloadId })['size']) {
                        doc.stats.downloadedSize += _.find(doc.files, { 'id': downloadId })['size'];
                    }
                    if (doc.stats.downloadedFiles === doc.files.length) {
                        doc.files = _.map(doc.files, file => {
                            if (file.id === downloadId) {
                                file.downloaded = file.size;
                            }
                            return file;
                        })
                        let pluginId = doc.pluginId;
                        delete doc.pluginId;
                        delete doc.statusMsg;
                        delete doc._rev;
                        doc.id = doc._id;
                        delete doc._id;
                        doc.status = STATUS.Completed;
                        EventManager.emit(`${pluginId}:download:complete`, doc);
                        return this.dbSDK.updateDoc(this.dataBaseName, docId, { status: STATUS.EventEmitted, updatedOn: Date.now() })
                    } else {
                        doc.files = _.map(doc.files, file => {
                            if (file.id === downloadId) {
                                file.downloaded = file.size;
                            }
                            return file;
                        })
                        return this.dbSDK.updateDoc(this.dataBaseName, docId, {
                            files: doc.files,
                            stats: doc.stats,
                            updatedOn: Date.now()
                        })
                    }
                }).catch(e => {
                    logger.error('while download complete processing', e, 'docId', docId, 'fileId', downloadId);
                })
            }
        });
    }

}

