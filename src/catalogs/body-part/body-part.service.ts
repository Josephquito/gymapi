import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCatalogDto } from '../dto/create-catalog.dto';
import { UpdateCatalogDto } from '../dto/update-catalog.dto';

@Injectable()
export class BodyPartService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.bodyPart.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  findAllAdmin() {
    return this.prisma.bodyPart.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateCatalogDto) {
    const exists = await this.prisma.bodyPart.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (exists) throw new BadRequestException('Ya existe una parte del cuerpo con ese nombre');

    return this.prisma.bodyPart.create({ data: { name: dto.name } });
  }

  async update(id: string, dto: UpdateCatalogDto) {
    const bodyPart = await this.prisma.bodyPart.findUnique({ where: { id } });
    if (!bodyPart) throw new NotFoundException('Parte del cuerpo no encontrada');

    if (dto.name) {
      const exists = await this.prisma.bodyPart.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (exists) throw new BadRequestException('Ya existe una parte del cuerpo con ese nombre');
    }

    return this.prisma.bodyPart.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    const bodyPart = await this.prisma.bodyPart.findUnique({ where: { id } });
    if (!bodyPart) throw new NotFoundException('Parte del cuerpo no encontrada');

    return this.prisma.bodyPart.update({ where: { id }, data: { isActive: false } });
  }

  async activate(id: string) {
    const bodyPart = await this.prisma.bodyPart.findUnique({ where: { id } });
    if (!bodyPart) throw new NotFoundException('Parte del cuerpo no encontrada');

    return this.prisma.bodyPart.update({ where: { id }, data: { isActive: true } });
  }
}
