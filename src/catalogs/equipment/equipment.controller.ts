import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { CreateCatalogDto } from '../dto/create-catalog.dto';
import { UpdateCatalogDto } from '../dto/update-catalog.dto';
import { EquipmentService } from './equipment.service';

@Controller('equipments')
@UseGuards(JwtGuard)
export class EquipmentController {
  constructor(private equipmentService: EquipmentService) {}

  @Get()
  findAll() {
    return this.equipmentService.findAll();
  }

  @Get('all')
  findAllAdmin(@Req() req: any) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.equipmentService.findAllAdmin();
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateCatalogDto) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.equipmentService.create(dto);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCatalogDto) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.equipmentService.update(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.equipmentService.deactivate(id);
  }

  @Patch(':id/activate')
  activate(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.equipmentService.activate(id);
  }
}
