export declare enum SplitType {
    EQUAL = "equal",
    BY_ITEMS = "by_items",
    CUSTOM = "custom_amount"
}
export declare class CreateEqualSplitDto {
    numberOfGuests: number;
    guestNames?: string[];
}
export declare class SplitItemAssignment {
    guestIndex: number;
    itemIds: string[];
}
export declare class CreateItemSplitDto {
    numberOfGuests: number;
    guestNames?: string[];
    assignments: SplitItemAssignment[];
}
export declare class CustomSplitGuest {
    name?: string;
    amount: number;
}
export declare class CreateCustomSplitDto {
    guests: CustomSplitGuest[];
}
export declare class ProcessSplitPaymentDto {
    method: string;
    amount: number;
    currencyCode?: string;
    reference?: string;
    cashReceived?: number;
}
