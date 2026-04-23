import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from '../otp/otp.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private otp: OtpService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword)
      throw new BadRequestException('Las contraseñas no coinciden');

    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new BadRequestException('El correo ya está registrado');

    const usernameTaken = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (usernameTaken)
      throw new BadRequestException('El username ya está en uso');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashed,
      },
    });

    return this.generateTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { username: dto.identifier }],
      },
    });

    if (!user || !user.password)
      throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    return this.generateTokens(user.id, user.email);
  }

  async googleAuth(googleUser: { googleId: string; email: string }) {
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      const username = googleUser.email.split('@')[0];
      user = await this.prisma.user.create({
        data: {
          username,
          email: googleUser.email,
          googleId: googleUser.googleId,
          provider: 'GOOGLE',
          isVerified: true,
        },
      });
    }

    return this.generateTokens(user.id, user.email);
  }

  async refreshTokens(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date())
      throw new UnauthorizedException('Refresh token inválido o expirado');

    await this.prisma.refreshToken.delete({ where: { token } });
    return this.generateTokens(stored.user.id, stored.user.email);
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword)
      throw new BadRequestException('Las contraseñas no coinciden');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { password: hashed },
    });
    return { message: 'Contraseña actualizada correctamente' };
  }

  async logout(token: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token } });
    return { message: 'Sesión cerrada' };
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  async googleMobileAuth(idToken: string) {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) throw new UnauthorizedException('Token inválido');

    const email = payload.email!;
    const googleId = payload.sub;

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      const username = email.split('@')[0];
      user = await this.prisma.user.create({
        data: {
          username,
          email,
          googleId,
          provider: 'GOOGLE',
          isVerified: true,
        },
      });
    }

    return this.generateTokens(user.id, user.email);
  }
}
