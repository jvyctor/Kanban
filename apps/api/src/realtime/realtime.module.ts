import { Module } from "@nestjs/common";
import { BoardsModule } from "../boards/boards.module";
import { BoardGateway } from "./realtime.gateway";

@Module({
  imports: [BoardsModule],
  providers: [BoardGateway],
  exports: [BoardGateway]
})
export class RealtimeModule {}
