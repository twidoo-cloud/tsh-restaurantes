import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../auth.service';
declare const JwtStrategy_base: any;
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(config: ConfigService);
    validate(payload: JwtPayload): unknown;
}
export {};
