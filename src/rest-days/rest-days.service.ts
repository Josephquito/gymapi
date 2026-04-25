import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RestDaysService {
  constructor(private prisma: PrismaService) {}

  async toggle(userId: string, date: string) {
    const existing = await this.prisma.restDay.findUnique({
      where: { userId_date: { userId, date } },
    });

    if (existing) {
      await this.prisma.restDay.delete({
        where: { userId_date: { userId, date } },
      });
      return { date, isRestDay: false };
    }

    await this.prisma.restDay.create({ data: { userId, date } });
    return { date, isRestDay: true };
  }

  async getByMonth(userId: string, year: number, month: number) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = `${year}-${String(month).padStart(2, '0')}-31`;

    const restDays = await this.prisma.restDay.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      select: { date: true },
    });

    return restDays.map((r) => r.date);
  }
}
