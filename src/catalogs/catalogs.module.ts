import { Module } from '@nestjs/common';
import { BodyPartController } from './body-part/body-part.controller';
import { BodyPartService } from './body-part/body-part.service';
import { EquipmentController } from './equipment/equipment.controller';
import { EquipmentService } from './equipment/equipment.service';
import { MuscleController } from './muscle/muscle.controller';
import { MuscleService } from './muscle/muscle.service';

@Module({
  controllers: [BodyPartController, EquipmentController, MuscleController],
  providers: [BodyPartService, EquipmentService, MuscleService],
})
export class CatalogsModule {}
