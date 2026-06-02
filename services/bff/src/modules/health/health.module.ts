import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MicroserviceModule } from '../microservice/microservice.module';

@Module({
  providers: [HealthService],
  controllers: [HealthController],
  exports: [HealthService],
  imports: [MicroserviceModule],
})
export class HealthModule {}
