import { AuthService } from './auth.service';
import { LoginDto, PinLoginDto, RefreshTokenDto } from './dto/auth.dto';
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
        };
        tenant: {
            id: string;
            name: string;
            isActive: boolean;
            slug: string;
        };
    }>;
    pinLogin(dto: PinLoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            firstName: any;
            lastName: any;
            avatarUrl: any;
            role: any;
            permissions: any;
        };
        tenant: any;
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
}
