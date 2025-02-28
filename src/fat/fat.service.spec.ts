import { Test, TestingModule } from '@nestjs/testing';
import { FatService } from './fat.service';
import { exec } from 'child_process';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fat } from './entities/fat.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';


describe('FatService', () => {
  let service: FatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
    imports:[
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
        TypeOrmModule.forFeature([Fat])],  
      providers: [FatService],
    }).compile();

    service = module.get<FatService>(FatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
/*
  it('should create new folder', async ()=> {
    await service.createArchive("/", null, "Hola", 0, true)
  })*/

  it('should create new sub folder', async ()=> {
    await service.moveArchive("/Hola/camion", "/Hola/caca")
  })
});