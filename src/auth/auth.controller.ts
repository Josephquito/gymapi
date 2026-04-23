import {
  Res,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpService } from '../otp/otp.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  ForgotPasswordDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from './dto/reset-password.dto';
import { GoogleGuard } from './guards/google.guard';
import { JwtGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private otp: OtpService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') token: string) {
    return this.auth.refreshTokens(token);
  }

  @Post('logout')
  logout(@Body('refreshToken') token: string) {
    return this.auth.logout(token);
  }

  @Get('google')
  @UseGuards(GoogleGuard)
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleGuard)
  async googleCallback(@Req() req: any, @Res() res: any) {
    const tokens = await this.auth.googleAuth(req.user);
    const deepLink = `gymapp://auth?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
    return res.redirect(deepLink);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.otp.sendOtp(dto.email);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otp.verifyOtp(dto.email, dto.code);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('google/mobile')
  googleMobile(@Body('idToken') idToken: string) {
    return this.auth.googleMobileAuth(idToken);
  }

  @UseGuards(JwtGuard)
  @Get('me')
  me(@Req() req: any) {
    return req.user;
  }
}
