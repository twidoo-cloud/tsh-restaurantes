import { SplitBillService } from './split-bill.service';
import { CreateEqualSplitDto, CreateItemSplitDto, CreateCustomSplitDto, ProcessSplitPaymentDto } from './dto/split-bill.dto';
export declare class SplitBillController {
    private splitBillService;
    constructor(splitBillService: SplitBillService);
    getSplits(tenantId: string, orderId: string): unknown;
    splitEqual(tenantId: string, orderId: string, dto: CreateEqualSplitDto): unknown;
    splitByItems(tenantId: string, orderId: string, dto: CreateItemSplitDto): unknown;
    splitCustom(tenantId: string, orderId: string, dto: CreateCustomSplitDto): unknown;
    processSplitPayment(tenantId: string, userId: string, orderId: string, splitId: string, dto: ProcessSplitPaymentDto): unknown;
    removeSplits(tenantId: string, orderId: string): unknown;
}
