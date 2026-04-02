import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { BoardsController } from "./boards.controller";
import { BoardPresenceService } from "./board-presence.service";
import { BoardsService } from "./boards.service";
import { BoardGateway } from "../realtime/realtime.gateway";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule, AuthModule, MailModule],
  controllers: [BoardsController],
  providers: [BoardsService, BoardGateway, BoardPresenceService],
  exports: [BoardsService, BoardGateway, BoardPresenceService]
})
export class BoardsModule {}
