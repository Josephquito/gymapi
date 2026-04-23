import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  async sendOtp(email: string, code: string) {
    await this.transporter.sendMail({
      from: `"GymApp" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Código para restablecer tu contraseña',
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:auto">
          <h2>Restablecer contraseña</h2>
          <p>Tu código OTP es:</p>
          <h1 style="letter-spacing:8px;font-size:36px">${code}</h1>
          <p>Expira en 10 minutos.</p>
        </div>
      `,
    });
  }
}
