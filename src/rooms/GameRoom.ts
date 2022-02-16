import { Room, matchMaker, Client } from "colyseus";
import { GameState } from "./GameState";

export class GameRoom extends Room<GameState> {
  position: boolean = false;
  idLeft: number;
  idRight: number;

  onCreate(options: any) {
    this.setState(new GameState());
    this.onMessage("position", (client, message) => {
      client.send("position", this.position ? "right" : "left");
      this.position = !this.position;
    });
    this.onMessage("moveleft", (client, message) => {
      // console.log("left -> ", message);
      this.state.leftPlayer.pos.y = message;
    });
    this.onMessage("moveright", (client, message) => {
      // console.log("right -> ", message);
      this.state.rightPlayer.pos.y = message;
    });
    this.onMessage("idleft", (client, message) => {
      console.log("id -> ", message);
      this.idLeft = message;
    });
    this.onMessage("idright", (client, message) => {
      console.log("id -> ", message);
      this.idRight = message;
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "join!");
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
