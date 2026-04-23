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
import { MuscleService } from './muscle.service';

@Controller('muscles')
@UseGuards(JwtGuard)
export class MuscleController {
  constructor(private muscleService: MuscleService) {}

  @Get()
  findAll() {
    return this.muscleService.findAll();
  }

  @Get('all')
  findAllAdmin(@Req() req: any) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.muscleService.findAllAdmin();
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateCatalogDto) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.muscleService.create(dto);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCatalogDto) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.muscleService.update(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.muscleService.deactivate(id);
  }

  @Patch(':id/activate')
  activate(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.muscleService.activate(id);
  }
}
