import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
import { CreateEqualSplitDto, CreateItemSplitDto, CreateCustomSplitDto, ProcessSplitPaymentDto } from './dto/split-bill.dto';
export declare class SplitBillService {
    private prisma;
    private wsGateway;
    constructor(prisma: PrismaService, wsGateway: PosEventsGateway);
    getSplits(tenantId: string, orderId: string): unknown;
    splitEqual(tenantId: string, orderId: string, dto: CreateEqualSplitDto): unknown;
    splitByItems(tenantId: string, orderId: string, dto: CreateItemSplitDto): unknown;
    splitCustom(tenantId: string, orderId: string, dto: CreateCustomSplitDto): unknown;
    processSplitPayment(tenantId: string, orderId: string, splitId: string, userId: string, dto: ProcessSplitPaymentDto): unknown;
    removeSplits(tenantId: string, orderId: string): unknown;
    private getOrderOrFail;
    private validateOrderForSplit;
}
