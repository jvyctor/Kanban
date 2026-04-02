import { Global, Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BoardsModule } from "../boards/boards.module";
import { BoardGateway } from "./realtime.gateway";

@Global()
@Module({
  imports: [BoardsModule, AuthModule],
  providers: [BoardGateway],
  exports: [BoardGateway]
})
export class RealtimeModule {}
