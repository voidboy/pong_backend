import { Room, matchMaker, Client } from "colyseus";
import { GameState } from "./GameState";

export class GameRoom extends Room<GameState> {
  position: boolean = false;

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
    this.onMessage("id", (client, message) => {
      console.log(this.state.ids, "HERE2");
      this.position
        ? (this.state.ids.idLeft = message)
        : (this.state.ids.idRight = message);
    });
    console.log("A gameRoom is created !");
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "gameRoom -> join!");
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
