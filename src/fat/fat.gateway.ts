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
        console.log("GET-FOLDER: ", data);
        const archive = await this.fatService.locate(data);
        client.emit('private', archive);
    }

    async broadcastEvent(event: string){
        this.server.emit("event", event);
    }
}