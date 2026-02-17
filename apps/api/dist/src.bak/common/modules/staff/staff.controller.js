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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const staff_service_1 = require("./staff.service");
const staff_dto_1 = require("./dto/staff.dto");
const tenant_decorator_1 = require("../../decorators/tenant.decorator");
let StaffController = class StaffController {
    constructor(service) {
        this.service = service;
    }
    getAll(tenantId) {
        return this.service.getAll(tenantId);
    }
    summary(tenantId) {
        return this.service.getTodaySummary(tenantId);
    }
    weekSchedule(tenantId) {
        return this.service.getWeekSchedule(tenantId);
    }
    attendance(tenantId, query) {
        return this.service.getAttendance(tenantId, query);
    }
    timeOff(tenantId, query) {
        return this.service.getTimeOff(tenantId, query);
    }
    payroll(tenantId, from, to) {
        return this.service.getPayrollSummary(tenantId, from, to);
    }
    getById(tenantId, id) {
        return this.service.getById(tenantId, id);
    }
    updateProfile(tenantId, id, dto) {
        return this.service.updateProfile(tenantId, id, dto);
    }
    setSchedule(tenantId, id, dto) {
        dto.userId = id;
        return this.service.setSchedule(tenantId, dto);
    }
    clockIn(tenantId, dto) {
        return this.service.clockIn(tenantId, dto);
    }
    clockOut(tenantId, id, dto) {
        return this.service.clockOut(tenantId, id, dto);
    }
    createTimeOff(tenantId, dto) {
        return this.service.createTimeOff(tenantId, dto);
    }
    reviewTimeOff(tenantId, id, action) {
        return this.service.reviewTimeOff(tenantId, id, action, '');
    }
};
exports.StaffController = StaffController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all staff' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Today attendance summary' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "summary", null);
__decorate([
    (0, common_1.Get)('schedule'),
    (0, swagger_1.ApiOperation)({ summary: 'Full week schedule' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "weekSchedule", null);
__decorate([
    (0, common_1.Get)('attendance'),
    (0, swagger_1.ApiOperation)({ summary: 'Attendance records' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, staff_dto_1.StaffQueryDto]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "attendance", null);
__decorate([
    (0, common_1.Get)('time-off'),
    (0, swagger_1.ApiOperation)({ summary: 'Time-off requests' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, staff_dto_1.StaffQueryDto]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "timeOff", null);
__decorate([
    (0, common_1.Get)('payroll'),
    (0, swagger_1.ApiOperation)({ summary: 'Payroll summary' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "payroll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get staff member details' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "getById", null);
__decorate([
    (0, common_1.Put)(':id/profile'),
    (0, swagger_1.ApiOperation)({ summary: 'Update staff profile' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, staff_dto_1.UpdateStaffProfileDto]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Put)(':id/schedule'),
    (0, swagger_1.ApiOperation)({ summary: 'Set staff schedule' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, staff_dto_1.SetScheduleDto]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "setSchedule", null);
__decorate([
    (0, common_1.Post)('clock-in'),
    (0, swagger_1.ApiOperation)({ summary: 'Clock in' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, staff_dto_1.ClockInDto]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "clockIn", null);
__decorate([
    (0, common_1.Patch)('clock-out/:attendanceId'),
    (0, swagger_1.ApiOperation)({ summary: 'Clock out' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('attendanceId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, staff_dto_1.ClockOutDto]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "clockOut", null);
__decorate([
    (0, common_1.Post)('time-off'),
    (0, swagger_1.ApiOperation)({ summary: 'Request time off' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, staff_dto_1.CreateTimeOffDto]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "createTimeOff", null);
__decorate([
    (0, common_1.Patch)('time-off/:id/:action'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve/reject time off' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('action')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "reviewTimeOff", null);
exports.StaffController = StaffController = __decorate([
    (0, swagger_1.ApiTags)('Staff'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('staff'),
    __metadata("design:paramtypes", [staff_service_1.StaffService])
], StaffController);
//# sourceMappingURL=staff.controller.js.map