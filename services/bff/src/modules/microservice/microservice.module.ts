import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MicroserviceService } from './microservice.service';

@Module({
  imports: [HttpModule],
  providers: [MicroserviceService],
  exports: [MicroserviceService],
})
export class MicroserviceModule {}
