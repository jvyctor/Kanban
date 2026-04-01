import { Module } from "@nestjs/common";
import { BoardsController } from "./boards.controller";
import { BoardsService } from "./boards.service";
import { BoardGateway } from "../realtime/realtime.gateway";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [BoardsController],
  providers: [BoardsService, BoardGateway],
  exports: [BoardsService, BoardGateway]
})
export class BoardsModule {}
