import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('Usuario no encontrado');

    await this.prisma.otpCode.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { code, userId: user.id, expiresAt },
    });

    await this.mail.sendOtp(email, code);
    return { message: 'Código enviado al correo' };
  }

  async verifyOtp(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('Usuario no encontrado');

    const otp = await this.prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otp) throw new BadRequestException('Código inválido o expirado');

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { used: true },
    });

    return { verified: true, userId: user.id };
  }
}
