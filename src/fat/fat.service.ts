import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Fat } from "./entities/fat.entity";
import { Like, Repository } from "typeorm";
import { FatGateway } from "./fat.gateway";

@Injectable()
export class FatService{
    constructor(
        @InjectRepository(Fat) private fatRepository : Repository<Fat>,
        private fatGateway: FatGateway,
    ){}

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
        this.fatGateway.broadcastEvent("New-Archive");
        return await this.createArchive(fullpath, folder, name, size, isFolder);
    }

    private async findOneByPath(path: string){
        const archive = await this.fatRepository.findOne({ where: { full_path: path }, relations: ['content']})
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
        previous ?  archive.previous = previous : "";

        return await this.fatRepository.save(archive);
    }

    async deleteArchive(fullpath: string){
        const folder = await this.locate(fullpath);

        if(!folder) return false;

        this.fatGateway.broadcastEvent("Delete-Archive");

        return await this.fatRepository.remove(folder);
    }

    async moveArchive(fullpath: string, to: string){
        const archive = await this.locate(fullpath);
        const to_archive = await this.locate(to);

        if(!archive) return;
        if(!to_archive) return;
        
        archive.full_path = `${to}/${archive.name}`;
        archive.previous = to_archive;

        this.fatGateway.broadcastEvent("Move-Archive");

        return await this.fatRepository.save(archive);
    }

    async changeArchive(fullpath: string){
        const archive = await this.locate(fullpath);

        if(!archive) return false;

        archive.date_modified = new Date(Date.now());

        this.fatGateway.broadcastEvent("Change-Archive");

        return await this.fatRepository.save(archive);
    }

    async exists(fullpath: string){
        const archive = await this.fatRepository.findOneBy({ full_path: fullpath });
        return archive;
    }

    async getTotalFrom(fullpath: string){
        const archives = await this.locate(fullpath);
    }
}