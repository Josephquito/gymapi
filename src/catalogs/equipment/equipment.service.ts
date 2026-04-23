import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCatalogDto } from '../dto/create-catalog.dto';
import { UpdateCatalogDto } from '../dto/update-catalog.dto';

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.equipment.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  findAllAdmin() {
    return this.prisma.equipment.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateCatalogDto) {
    const exists = await this.prisma.equipment.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (exists) throw new BadRequestException('Ya existe un equipo con ese nombre');

    return this.prisma.equipment.create({ data: { name: dto.name } });
  }

  async update(id: string, dto: UpdateCatalogDto) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id } });
    if (!equipment) throw new NotFoundException('Equipo no encontrado');

    if (dto.name) {
      const exists = await this.prisma.equipment.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (exists) throw new BadRequestException('Ya existe un equipo con ese nombre');
    }

    return this.prisma.equipment.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id } });
    if (!equipment) throw new NotFoundException('Equipo no encontrado');

    return this.prisma.equipment.update({ where: { id }, data: { isActive: false } });
  }

  async activate(id: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id } });
    if (!equipment) throw new NotFoundException('Equipo no encontrado');

    return this.prisma.equipment.update({ where: { id }, data: { isActive: true } });
  }
}
