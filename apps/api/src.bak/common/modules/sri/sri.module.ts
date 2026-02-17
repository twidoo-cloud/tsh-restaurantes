import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { SriController } from './sri.controller';
import { SriService } from './sri.service';

@Module({
  imports: [
    MulterModule.register({
      // Memory storage - files are passed as buffers
      storage: undefined,
    }),
  ],
  controllers: [SriController],
  providers: [SriService],
  exports: [SriService],
})
export class SriModule {}
