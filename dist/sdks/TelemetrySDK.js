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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telemetryInstance_1 = require("./../services/telemetry/telemetryInstance");
const TelemetryExport_1 = require("./../services/telemetry/TelemetryExport");
const typescript_ioc_1 = require("typescript-ioc");
const SettingSDK_1 = __importDefault(require("./SettingSDK"));
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
    setTelemetryConfigSyncToServer(syncToServer) {
        if (syncToServer === undefined || typeof syncToServer !== "boolean") {
            throw {
                code: "BAD_REQUEST",
                status: 400,
                message: "SyncToServer key should exist and it should be boolean"
            };
        }
        return this.settingSDK.put('isTelemetrySyncToServer', { syncToServer: syncToServer, updatedOn: Date.now() });
    }
    getTelemetryConfigSyncToServer() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.settingSDK.get('isTelemetrySyncToServer');
            }
            catch (error) {
                return { syncToServer: true };
            }
        });
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
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", SettingSDK_1.default)
], TelemetrySDK.prototype, "settingSDK", void 0);
exports.default = TelemetrySDK;
