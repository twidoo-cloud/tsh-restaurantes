export declare class OpenShiftDto {
    cashRegisterId: string;
    openingAmount: number;
    notes?: string;
}
export declare class CloseShiftDto {
    closingAmount: number;
    notes?: string;
}
export declare class ShiftQueryDto {
    status?: string;
    page?: number;
    limit?: number;
}
