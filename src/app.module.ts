import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { ExercisesModule } from './exercises/exercises.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { SystemExercisesModule } from './system-exercises/system-exercises.module';
import { RoutinesModule } from './routines/routines.module';
import { SessionsModule } from './sessions/sessions.module';
import { StatsModule } from './stats/stats.module';
import { RestDaysModule } from './rest-days/rest-days.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailModule,
    AuthModule,
    ExercisesModule,
    CatalogsModule,
    SystemExercisesModule,
    RoutinesModule,
    SessionsModule,
    StatsModule,
    RestDaysModule,
  ],
})
export class AppModule {}
