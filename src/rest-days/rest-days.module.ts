import { Module } from '@nestjs/common';
import { RestDaysController } from './rest-days.controller';
import { RestDaysService } from './rest-days.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RestDaysController],
  providers: [RestDaysService],
})
export class RestDaysModule {}
