import { AuthService } from './auth.service';
import { LoginDto, PinLoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, SetPinDto } from './dto/auth.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            avatarUrl: string;
            role: string;
            permissions: import("@prisma/client/runtime/library").JsonValue;
            defaultBranchId: string;
        };
        tenant: {
            trialExpired: boolean;
            trialDaysRemaining: number;
            id: string;
            name: string;
            isActive: boolean;
            slug: string;
            verticalType: string;
            countryCode: string;
            currencyCode: string;
            subscriptionPlan: string;
            subscriptionStatus: string;
            trialEndsAt: Date;
        };
        branches: {
            id: string;
            tenantId: string;
            createdAt: Date;
            name: string;
            email: string | null;
            isActive: boolean;
            updatedAt: Date;
            address: import("@prisma/client/runtime/library").JsonValue | null;
            phone: string | null;
            settings: import("@prisma/client/runtime/library").JsonValue;
            code: string;
            establecimientoSri: string;
            puntoEmisionSri: string;
            isMain: boolean;
        }[];
    }>;
    pinLogin(dto: PinLoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            avatarUrl: string;
            role: string;
            permissions: import("@prisma/client/runtime/library").JsonValue;
            defaultBranchId: string;
        };
        tenant: {
            trialExpired: boolean;
            trialDaysRemaining: number;
            id: string;
            name: string;
            isActive: boolean;
            slug: string;
            verticalType: string;
            countryCode: string;
            currencyCode: string;
            subscriptionPlan: string;
            subscriptionStatus: string;
            trialEndsAt: Date;
        };
        branches: {
            id: string;
            tenantId: string;
            createdAt: Date;
            name: string;
            email: string | null;
            isActive: boolean;
            updatedAt: Date;
            address: import("@prisma/client/runtime/library").JsonValue | null;
            phone: string | null;
            settings: import("@prisma/client/runtime/library").JsonValue;
            code: string;
            establecimientoSri: string;
            puntoEmisionSri: string;
            isMain: boolean;
        }[];
    }>;
    pinTenants(): Promise<{
        id: string;
        name: string;
        slug: string;
        logoUrl: string;
    }[]>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
    refresh(dto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        avatarUrl: string;
        role: string;
        permissions: import("@prisma/client/runtime/library").JsonValue;
        hasPin: boolean;
        tenant: {
            id: string;
            name: string;
            slug: string;
        };
    }>;
    updateProfile(userId: string, body: {
        firstName?: string;
        lastName?: string;
        avatarUrl?: string;
    }): Promise<{
        id: string;
        tenantId: string;
        createdAt: Date;
        email: string;
        roleId: string;
        passwordHash: string;
        pinHash: string | null;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        defaultBranchId: string | null;
        updatedAt: Date;
    }>;
    changePassword(userId: string, body: {
        currentPassword: string;
        newPassword: string;
    }): Promise<{
        success: boolean;
    }>;
    setPin(userId: string, dto: SetPinDto): Promise<{
        success: boolean;
    }>;
    removePin(userId: string): Promise<{
        success: boolean;
    }>;
    switchBranch(userId: string, branchId: string): Promise<{
        accessToken: string;
        refreshToken: string;
        branch: {
            id: string;
            tenantId: string;
            createdAt: Date;
            name: string;
            email: string | null;
            isActive: boolean;
            updatedAt: Date;
            address: import("@prisma/client/runtime/library").JsonValue | null;
            phone: string | null;
            settings: import("@prisma/client/runtime/library").JsonValue;
            code: string;
            establecimientoSri: string;
            puntoEmisionSri: string;
            isMain: boolean;
        };
    }>;
}
