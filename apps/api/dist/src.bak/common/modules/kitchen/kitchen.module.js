"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KitchenModule = void 0;
const common_1 = require("@nestjs/common");
const kitchen_service_1 = require("./kitchen.service");
const kitchen_controller_1 = require("./kitchen.controller");
let KitchenModule = class KitchenModule {
};
exports.KitchenModule = KitchenModule;
exports.KitchenModule = KitchenModule = __decorate([
    (0, common_1.Module)({
        providers: [kitchen_service_1.KitchenService],
        controllers: [kitchen_controller_1.KitchenController],
        exports: [kitchen_service_1.KitchenService],
    })
], KitchenModule);
//# sourceMappingURL=kitchen.module.js.map