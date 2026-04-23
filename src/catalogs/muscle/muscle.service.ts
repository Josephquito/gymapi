import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCatalogDto } from '../dto/create-catalog.dto';
import { UpdateCatalogDto } from '../dto/update-catalog.dto';

@Injectable()
export class MuscleService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.muscle.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  findAllAdmin() {
    return this.prisma.muscle.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateCatalogDto) {
    const exists = await this.prisma.muscle.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (exists) throw new BadRequestException('Ya existe un músculo con ese nombre');

    return this.prisma.muscle.create({ data: { name: dto.name } });
  }

  async update(id: string, dto: UpdateCatalogDto) {
    const muscle = await this.prisma.muscle.findUnique({ where: { id } });
    if (!muscle) throw new NotFoundException('Músculo no encontrado');

    if (dto.name) {
      const exists = await this.prisma.muscle.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (exists) throw new BadRequestException('Ya existe un músculo con ese nombre');
    }

    return this.prisma.muscle.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    const muscle = await this.prisma.muscle.findUnique({ where: { id } });
    if (!muscle) throw new NotFoundException('Músculo no encontrado');

    return this.prisma.muscle.update({ where: { id }, data: { isActive: false } });
  }

  async activate(id: string) {
    const muscle = await this.prisma.muscle.findUnique({ where: { id } });
    if (!muscle) throw new NotFoundException('Músculo no encontrado');

    return this.prisma.muscle.update({ where: { id }, data: { isActive: true } });
  }
}
