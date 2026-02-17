import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { JwtPayload } from '../auth.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(config: ConfigService);
    validate(payload: JwtPayload): Promise<{
        sub: string;
        tenantId: string;
        branchId: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        permissions: any[];
    }>;
}
export {};
