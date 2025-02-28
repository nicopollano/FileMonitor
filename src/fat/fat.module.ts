import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Fat } from "./entities/fat.entity";
import { FatService } from "./fat.service";
import { FatGateway } from "./fat.gateway";

@Module({
    imports: [TypeOrmModule.forFeature([Fat])],
    providers: [FatService, FatGateway],
    exports: [FatService]
})
export class FatModule{}