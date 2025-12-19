import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConstitutionModule } from './constitution/constitution.module';
import { PerformanceModule } from './performance/performance.module';
import { GovernanceModule } from './governance/governance.module';
import { SearchModule } from './search/search.module';
import { PaymentModule } from './payment/payment.module';
import { CommonModule } from './common/common.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
    }),

    // Feature Modules
    AuthModule,
    ConstitutionModule,
    PerformanceModule,
    GovernanceModule,
    SearchModule,
    PaymentModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
