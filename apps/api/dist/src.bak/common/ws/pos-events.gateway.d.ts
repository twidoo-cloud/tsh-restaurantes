import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export declare class PosEventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private configService;
    server: Server;
    private logger;
    private connectedClients;
    constructor(jwtService: JwtService, configService: ConfigService);
    afterInit(): void;
    handleConnection(client: Socket): any;
    handleDisconnect(client: Socket): void;
    handleJoinRoom(client: Socket, data: {
        room: string;
    }): void;
    handleLeaveRoom(client: Socket, data: {
        room: string;
    }): void;
    emitToTenant(tenantId: string, event: string, data: any): void;
    emitToRole(tenantId: string, role: string, event: string, data: any): void;
    emitToRoom(tenantId: string, room: string, event: string, data: any): void;
    emitKitchenNewOrder(tenantId: string, data: {
        orderId: string;
        orderNumber: string;
        items: any[];
        tableNumber?: string;
    }): void;
    emitKitchenItemUpdated(tenantId: string, data: {
        kitchenOrderId: string;
        orderId: string;
        status: string;
        productName?: string;
    }): void;
    emitKitchenOrderBumped(tenantId: string, data: {
        orderId: string;
        orderNumber?: string;
    }): void;
    emitTableStatusChanged(tenantId: string, data: {
        tableId: string;
        tableNumber: string;
        status: string;
        orderId?: string;
    }): void;
    emitOrderCreated(tenantId: string, data: {
        orderId: string;
        orderNumber: string;
        type: string;
        tableId?: string;
    }): void;
    emitOrderUpdated(tenantId: string, data: {
        orderId: string;
        orderNumber?: string;
        action: string;
    }): void;
    emitOrderPaid(tenantId: string, data: {
        orderId: string;
        orderNumber?: string;
        total: number;
        method: string;
    }): void;
    emitOrderCancelled(tenantId: string, data: {
        orderId: string;
        orderNumber?: string;
    }): void;
    emitShiftOpened(tenantId: string, data: {
        shiftId: string;
        cashRegisterName: string;
        openedBy: string;
        openingAmount: number;
    }): void;
    emitShiftClosed(tenantId: string, data: {
        shiftId: string;
        closingAmount: number;
        difference: number;
    }): void;
    getConnectedCount(tenantId: string): number;
}
