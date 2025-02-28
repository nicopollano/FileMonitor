import { Module } from '@nestjs/common';
import { FileTraceService } from './tasks/file-trace.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FatModule } from './fat/fat.module';
import { Fat } from './fat/entities/fat.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env"
    }),
    TypeOrmModule.forRootAsync({
      imports:[ConfigModule],
      useFactory: (configService:ConfigService) => ({
        type: "postgres",
        host: "localhost",
        port: 5432,
        username: "postgres",
        password: "postgres",
        database: "filetrace",
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true
      }),
      inject: [ConfigService]
    }),
    FatModule,
    
  ],
  controllers: [],
  providers: [
    FileTraceService,
  ],
})
export class AppModule {}
