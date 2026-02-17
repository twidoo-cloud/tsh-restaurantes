import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PosEventsGateway } from './pos-events.gateway';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'pos-jwt-secret-dev'),
      }),
    }),
  ],
  providers: [PosEventsGateway],
  exports: [PosEventsGateway],
})
export class WsModule {}
