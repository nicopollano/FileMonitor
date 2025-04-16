import { Injectable, OnModuleInit } from "@nestjs/common";
import * as chokidar from 'chokidar'
import * as fs from 'fs'
import { FatService } from "src/fat/fat.service";
import { EventEmitter } from "stream";

@Injectable()
export class FileTraceService implements OnModuleInit{

    private watcher: chokidar.FSWatcher;
    private initialized: boolean = false;
    private timer: any = null;
    private emitter = new EventEmitter();
    private eventChain = Promise.resolve();

    private maxThreads = Number(process.env.MAX_THREADS);
    private activeThreadCount = 0;
    private threadQueue: (()=> Promise<any>)[] = [];
    
    constructor(
        private fatService : FatService,
    ){}

    onModuleInit(){
        this.startWatching();
    }
    
    startWatching(){
        this.watcher = chokidar.watch(process.env.ROUTE as string, { persistent: true })

        this.watcher.on("add", (filePath) => this.enqueue(() => this.onNewFile(filePath.replace(`${process.env.ROUTE}`, ""), "creado")));
        this.watcher.on("addDir", (filePath) => this.enqueue(() => this.onNewFile(filePath.replace(`${process.env.ROUTE}`, ""), "creado")));
        this.watcher.on("unlink", (filePath) => this.enqueue(() => this.onDel(filePath.replace(`${process.env.ROUTE}`, ""), "borrado")));
        this.watcher.on("unlinkDir", (filePath) => this.enqueue(() => this.onDel(filePath.replace(`${process.env.ROUTE}`, ""), "borrado")));
        this.watcher.on("change", filePath => this.enqueue(() => this.onChange(filePath.replace(`${process.env.ROUTE}`, ""), "creado")));

        this.emitter.on("process", async (task: ()=> Promise<any>) =>{
            //this.eventChain = this.eventChain.then(() => task()).catch(console.error);
            this.threadQueue.push(task);
            this.processQueue();
        });
    }

    private enqueue(task: ()=> Promise<any>){
        this.threadQueue.push(task);
        this.processQueue();
    }

    private processQueue(){
        if(this.activeThreadCount > this.maxThreads || this.threadQueue.length == 0) return;

        const task = this.threadQueue.shift();
        if(!task) return;

        this.activeThreadCount++;
        task()
            .catch(console.error)
            .finally(()=>{
                this.activeThreadCount--;
                this.processQueue();
            });

        this.processQueue();
    }

    async onNewFile(filePath: string, eventType: string){
        return new Promise((res, rej)=>{
            fs.stat(`${process.env.ROUTE}/${filePath}`, async (err, stat)=>{
                filePath = filePath;
                
                const archiveExists = await this.fatService.exists(filePath);
                console.log(`Nuevo archivo[${filePath}]: ${stat.isDirectory() ? "Carpeta" : "Archivo"}${archiveExists ? " Old" : " NEW"}`);
                if(archiveExists) {
                    await this.fatService.controlSize(filePath, stat.size);
                    res(false);
                    return;
                }
    
                await this.fatService.newArchive(filePath, filePath.substring(filePath.lastIndexOf("/") + 1 ), stat.size, stat.isDirectory());
                res(true);
            }); 
            
            this.syncTimer();
        })
    }

    async onDel(filePath: string, eventType: string){
        filePath = filePath;
        
        const archiveExists = await this.fatService.exists(filePath);
        console.log(`Eliminando archivo[${filePath}]: ${archiveExists?.isFolder ? "Carpeta" : "Archivo"}${archiveExists ? " LOCATED" : ""}`);
        if(!archiveExists) return;

        await this.fatService.deleteArchive(filePath);

        this.syncTimer();
    }


    async onChange(filePath: string, eventType: string){
        fs.stat(`${process.env.ROUTE}/${filePath}`, async (err, stat)=>{
            filePath = filePath;
            
            const archiveExists = await this.fatService.exists(filePath);
            console.log(`Edicion archivo[${filePath}]:${archiveExists ? " Old" : ""}`);
            if(!archiveExists) return;

            await this.fatService.changeArchive(filePath, stat.size);

        });
    }

    syncTimer(){
        if(this.initialized) return;
        if(this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(()=> {this.analisisCompleted(); }, 3000);
    }

    analisisCompleted(){
        this.initialized = true;

        console.log("-- ANALISIS DONE --");
    }
}   
