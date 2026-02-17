import { AuthService } from './auth.service';
import { LoginDto, PinLoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, SetPinDto } from './dto/auth.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): unknown;
    pinLogin(dto: PinLoginDto): unknown;
    pinTenants(): unknown;
    forgotPassword(dto: ForgotPasswordDto): unknown;
    resetPassword(dto: ResetPasswordDto): unknown;
    refresh(dto: RefreshTokenDto): unknown;
    getProfile(userId: string): unknown;
    updateProfile(userId: string, body: {
        firstName?: string;
        lastName?: string;
        avatarUrl?: string;
    }): unknown;
    changePassword(userId: string, body: {
        currentPassword: string;
        newPassword: string;
    }): unknown;
    setPin(userId: string, dto: SetPinDto): unknown;
    removePin(userId: string): unknown;
    switchBranch(userId: string, branchId: string): unknown;
}
