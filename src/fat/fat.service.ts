import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Fat } from "./entities/fat.entity";
import { Like, Repository } from "typeorm";
import { FatGateway } from "./fat.gateway";
import * as fs from 'fs'

@Injectable()
export class FatService implements OnModuleInit{
    constructor(
        @InjectRepository(Fat) private fatRepository : Repository<Fat>,
        private fatGateway: FatGateway,
    ){}

    async onModuleInit() {
        await this.fatRepository.query('UPDATE public.fat SET "totalSize" = 0');
        console.log("✅ TotalSize reseteado al iniciar el módulo");
    }

    async locate(path: string, descarte_last: boolean = false){
        const folders = path.substring(1).split("/");
        if(descarte_last) folders.pop();
        let last_folder: Fat | null = null;

        for(let [index, folder] of folders.entries()) {
            const path = "/" + (folders.length > 0 ? folders.slice(0, index + 1).join("/") : folders[0]);
            const archive = await this.findOneByPath(path);

            if(!archive) return null;

            last_folder = archive;
        }

        return last_folder;
    }

    async newArchive(fullpath: string, name: string, size: number, isFolder: boolean){
        const isRootFolder = (fullpath == "/" + name);
        const folder = await this.locate(fullpath, true);

        if(!folder && !isRootFolder) return;
        const new_archive = await this.createArchive(fullpath, folder, name, size, isFolder);
        this.fatGateway.broadcastEvent("New-Archive:" + fullpath);
        return new_archive;
    }

    private async findOneByPath(path: string){
        const archive = await this.fatRepository.findOne({ where: { full_path: path }, relations: ['content', 'previous']})
        if(!archive) return null;
        return archive;
    }

    private async createArchive(fullpath: string, previous: Fat | null, name: string, size: number, isFolder: boolean){

        const archive = new Fat();

        archive.full_path = fullpath;
        archive.date_created = archive.date_modified = new Date(Date.now());
        archive.isFolder = isFolder;
        archive.size = size;
        archive.name = name;

        const archive_created = await this.fatRepository.save(archive); 

        if(previous){
            archive_created.previous = previous;
            await this.fatRepository.save(archive_created);
            await this.increaseSize(archive_created.id, size);
        }
    }

    async deleteArchive(fullpath: string){
        const archive = await this.locate(fullpath);

        if(!archive) return false;

        await this.decreaseSize(archive.id, archive.totalSize);

        this.fatGateway.broadcastEvent("Delete-Archive");

        return await this.fatRepository.remove(archive);
    }

    async moveArchive(fullpath: string, to: string){
        const archive = await this.locate(fullpath);
        const to_archive = await this.locate(to);

        if(!archive) return;
        if(!to_archive) return;
        
        archive.full_path = `${to}/${archive.name}`;
        
        const temp = archive.totalSize;

        await this.decreaseSize(archive.id, temp);

        await this.fatRepository.save(archive.previous);

        archive.previous = to_archive;
        await this.increaseSize(archive.id, archive.size);

        this.fatGateway.broadcastEvent("Move-Archive");

        return await this.fatRepository.save(archive);
    }

    async changeArchive(fullpath: string, size){
        const archive = await this.locate(fullpath);

        if(!archive) return false;

        archive.date_modified = new Date(Date.now());

        const temp = archive.size;

        await this.decreaseSize(archive.id, temp)
        await this.increaseSize(archive.id, size);

        await this.fatRepository.save(archive.previous);
        
        archive.size = size;
        
        this.fatGateway.broadcastEvent("Change-Archive");

        return await this.fatRepository.save(archive);
    }

    async exists(fullpath: string){
        const archive = await this.fatRepository.findOneBy({ full_path: fullpath });
        return archive;
    }

    async controlSize(path: string, size: number){
        const archive = await this.locate(path);

        if(!archive) return;

        if(archive.totalSize != size){
            if(archive.totalSize > 0) await this.decreaseSize(archive.id, archive.size);
            const archive_updated = await this.increaseSize(archive.id, size);
            if(!archive_updated) return;
            archive_updated.size = size;
            await this.fatRepository.save(archive_updated);
        } 
    }

    async getTotalFrom(fullpath: string){
        const archives = await this.locate(fullpath);

        if(!archives) return "Not found";

        const total = archives.totalSize; //await this.getTotalTree(archives);
        
        return total;
    }

    async getContent(archive: Fat){
        const _archive = await this.fatRepository.findOne({
            where:{
                id: archive.id
            },
            relations: ['content']
        });

        if(!_archive) return null;

        return _archive.content;
    }

    async getTotalTree(archive: Fat): Promise<number>{
        const content = await this.getContent(archive);
        if(!content) return 0;

        let totalSize = 0;
        for(const _archive of content){
            if(!_archive.isFolder) {
                totalSize += Number(_archive.size);
                continue;
            }
            totalSize += await this.getTotalTree(_archive);
        }

        return totalSize;
    }

    async increaseSize(archiveid: number, size: number){
        const archive = await this.fatRepository.findOne({
            where: {
                id: archiveid
            },
            relations: ['previous']
        });

        if(!archive) return null;

        isNaN(archive.totalSize) ? archive.totalSize = Number(size) : archive.totalSize = Number(archive.totalSize) + Number(size);
        if(archive.previous)
            await this.increaseSize(archive.previous.id, size);  

        await this.fatRepository.save(archive);

        return archive;
    }

    async decreaseSize(archiveid: number, size: number){
        const archive = await this.fatRepository.findOne({
            where: {
                id: archiveid
            },
            relations: ['previous']
        });
        if(!archive) return null;

        isNaN(archive.totalSize) ? archive.totalSize = Number(size) : archive.totalSize = Number(archive.totalSize) - Number(size);
        if(archive.previous)
            await this.decreaseSize(archive.previous.id, size);

        await this.fatRepository.save(archive);
    }
}