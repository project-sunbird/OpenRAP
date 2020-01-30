"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const telemetryInstance_1 = require("./../services/telemetry/telemetryInstance");
const TelemetryExport_1 = require("./../services/telemetry/TelemetryExport");
const typescript_ioc_1 = require("typescript-ioc");
class TelemetrySDK {
    getInstance() {
        return this.telemetryInstance;
    }
    send(events) {
        return this.telemetryInstance.send(events);
    }
    export(destPath, cb) {
        return this.telemetryExport.export(destPath, cb);
    }
    info(cb) {
        return this.telemetryExport.info(cb);
    }
}
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", telemetryInstance_1.TelemetryInstance)
], TelemetrySDK.prototype, "telemetryInstance", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", TelemetryExport_1.TelemetryExport)
], TelemetrySDK.prototype, "telemetryExport", void 0);
exports.default = TelemetrySDK;
