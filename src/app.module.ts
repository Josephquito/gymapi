import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { ExercisesModule } from './exercises/exercises.module';
import { CatalogsModule } from './catalogs/catalogs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailModule,
    AuthModule,
    ExercisesModule,
    CatalogsModule,
  ],
})
export class AppModule {}
