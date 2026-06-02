import { Module } from '@nestjs/common';
import { MicroserviceModule } from '../microservice/microservice.module';

@Module({
  imports: [MicroserviceModule],
})
export class AnalyticsModule {}
