import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { SplitBillService } from './split-bill.service';
import { SplitBillController } from './split-bill.controller';
import { WsModule } from '../../ws/ws.module';
@Module({
  imports: [WsModule],
  providers: [OrdersService, SplitBillService],
  controllers: [OrdersController, SplitBillController],
  exports: [OrdersService, SplitBillService],
})
export class OrdersModule {}