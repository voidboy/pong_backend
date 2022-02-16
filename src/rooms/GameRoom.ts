import { Room, matchMaker, Client } from "colyseus";
import { GameState } from "./GameState";

export class GameRoom extends Room<GameState> {

  readies:boolean[] = [false, false];

  onCreate (options: any) {
    this.setState(new GameState());
    this.onMessage("ready", (client, message) => {
    });
  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "join!");
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}