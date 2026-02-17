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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PosEventsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
let PosEventsGateway = class PosEventsGateway {
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.logger = new common_1.Logger('PosEventsGateway');
        this.connectedClients = new Map();
    }
    afterInit() {
        this.logger.log('🔌 WebSocket Gateway initialized on /pos namespace');
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '') ||
                client.handshake.query?.token;
            if (!token) {
                this.logger.warn(`Client ${client.id} rejected: no token`);
                client.emit('error', { message: 'Authentication required' });
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('JWT_SECRET', 'pos-jwt-secret-dev'),
            });
            const tenantId = payload.tenantId;
            const userId = payload.sub;
            const role = payload.role;
            this.connectedClients.set(client.id, { tenantId, userId, role });
            client.join(`tenant:${tenantId}`);
            client.join(`tenant:${tenantId}:role:${role}`);
            this.logger.log(`✅ Client ${client.id} connected — tenant: ${tenantId}, user: ${userId}, role: ${role}`);
            client.emit('connected', {
                clientId: client.id,
                tenantId,
                userId,
                role,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            this.logger.warn(`Client ${client.id} rejected: invalid token`);
            client.emit('error', { message: 'Invalid or expired token' });
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        const info = this.connectedClients.get(client.id);
        this.connectedClients.delete(client.id);
        this.logger.log(`❌ Client ${client.id} disconnected${info ? ` — tenant: ${info.tenantId}` : ''}`);
    }
    handleJoinRoom(client, data) {
        const info = this.connectedClients.get(client.id);
        if (!info)
            return;
        const scopedRoom = `tenant:${info.tenantId}:${data.room}`;
        client.join(scopedRoom);
        this.logger.debug(`Client ${client.id} joined room: ${scopedRoom}`);
    }
    handleLeaveRoom(client, data) {
        const info = this.connectedClients.get(client.id);
        if (!info)
            return;
        const scopedRoom = `tenant:${info.tenantId}:${data.room}`;
        client.leave(scopedRoom);
    }
    emitToTenant(tenantId, event, data) {
        this.server.to(`tenant:${tenantId}`).emit(event, {
            ...data,
            _ts: new Date().toISOString(),
        });
    }
    emitToRole(tenantId, role, event, data) {
        this.server.to(`tenant:${tenantId}:role:${role}`).emit(event, {
            ...data,
            _ts: new Date().toISOString(),
        });
    }
    emitToRoom(tenantId, room, event, data) {
        this.server.to(`tenant:${tenantId}:${room}`).emit(event, {
            ...data,
            _ts: new Date().toISOString(),
        });
    }
    emitKitchenNewOrder(tenantId, data) {
        this.emitToTenant(tenantId, 'kitchen:new-order', data);
    }
    emitKitchenItemUpdated(tenantId, data) {
        this.emitToTenant(tenantId, 'kitchen:item-updated', data);
    }
    emitKitchenOrderBumped(tenantId, data) {
        this.emitToTenant(tenantId, 'kitchen:order-bumped', data);
    }
    emitTableStatusChanged(tenantId, data) {
        this.emitToTenant(tenantId, 'table:status-changed', data);
    }
    emitOrderCreated(tenantId, data) {
        this.emitToTenant(tenantId, 'order:created', data);
    }
    emitOrderUpdated(tenantId, data) {
        this.emitToTenant(tenantId, 'order:updated', data);
    }
    emitOrderPaid(tenantId, data) {
        this.emitToTenant(tenantId, 'order:paid', data);
    }
    emitOrderCancelled(tenantId, data) {
        this.emitToTenant(tenantId, 'order:cancelled', data);
    }
    emitShiftOpened(tenantId, data) {
        this.emitToTenant(tenantId, 'shift:opened', data);
    }
    emitShiftClosed(tenantId, data) {
        this.emitToTenant(tenantId, 'shift:closed', data);
    }
    getConnectedCount(tenantId) {
        let count = 0;
        for (const [, info] of this.connectedClients) {
            if (info.tenantId === tenantId)
                count++;
        }
        return count;
    }
};
exports.PosEventsGateway = PosEventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], PosEventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join-room'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], PosEventsGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave-room'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], PosEventsGateway.prototype, "handleLeaveRoom", null);
exports.PosEventsGateway = PosEventsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
        namespace: '/pos',
        transports: ['websocket', 'polling'],
    }),
    __metadata("design:paramtypes", [typeof (_a = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _a : Object, typeof (_b = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _b : Object])
], PosEventsGateway);
//# sourceMappingURL=pos-events.gateway.js.map