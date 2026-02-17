export declare class CreateReservationDto {
    guestName: string;
    guestPhone?: string;
    guestEmail?: string;
    guestCount: number;
    reservationDate: string;
    startTime: string;
    durationMinutes?: number;
    tableId?: string;
    customerId?: string;
    notes?: string;
    specialRequests?: string;
    source?: string;
}
export declare class UpdateReservationDto {
    guestName?: string;
    guestPhone?: string;
    guestEmail?: string;
    guestCount?: number;
    reservationDate?: string;
    startTime?: string;
    durationMinutes?: number;
    tableId?: string;
    notes?: string;
    specialRequests?: string;
}
export declare class ReservationQueryDto {
    date?: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
}
export declare class UpdateSettingsDto {
    isEnabled?: boolean;
    defaultDurationMinutes?: number;
    minAdvanceHours?: number;
    maxAdvanceDays?: number;
    slotIntervalMinutes?: number;
    openingTime?: string;
    closingTime?: string;
    maxPartySize?: number;
    autoCancelMinutes?: number;
    confirmationRequired?: boolean;
    allowOnlineBooking?: boolean;
}
export declare class CancelReservationDto {
    reason?: string;
}
