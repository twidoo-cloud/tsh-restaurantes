import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { SriXmlService } from './sri-xml.service';

@Module({
  providers: [InvoicesService, SriXmlService],
  controllers: [InvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
