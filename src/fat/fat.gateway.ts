import { forwardRef, Inject, OnModuleInit } from "@nestjs/common";
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets"
import { Server } from "http";
import { Socket } from "socket.io";
import { FatService } from "./fat.service";

@WebSocketGateway({

})
export class FatGateway implements OnModuleInit {
    @WebSocketServer() private server: Server;

    constructor(
        @Inject(forwardRef(()=>FatService)) private fatService: FatService,
    ){}

    onModuleInit() {
        this.server.listen(3001);
    }

    @SubscribeMessage("get-folder")
    async getFolder(@MessageBody() data: string,@ConnectedSocket() client: Socket){
        data = data.replaceAll(process.env.ROUTE as string, "");
        if(data[data.length-1] == "/") data = data.substring(0, data.length-1);
        console.log("GET-FOLDER: ", data);
        const archive = await this.fatService.locate(data);
        client.emit('private', archive);

        return archive;
    }

    @SubscribeMessage("get-total-size")
    async getTotal(@MessageBody() path: string, @ConnectedSocket() client: Socket){
        path = path.replaceAll(process.env.ROUTE as string, "");
        if(path[path.length-1] == "/") path = path.substring(0, path.length-1);
        console.log("GET-TOTAL-SIZE: ", path);

        const total = await this.fatService.getTotalFrom(path);
        
        client.emit('private', total);

        return total;
    }


    async broadcastEvent(event: string){
        this.server.emit("event", event);
    }
}