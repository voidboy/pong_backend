import { Room, Client, matchMaker } from "colyseus";

export class DuelRoom extends Room {
  // Map to store duels => K = nickname, V = RoomId
  duels = new Map<number, string>();

  onCreate(options: any) {
    console.log("DuelRoom created -> ", this.roomId);
    this.onMessage("addDuel", async (client, message) => {
      const newRoom = await matchMaker.createRoom("gameRoom", {});
      this.duels.set(message.id, newRoom.roomId);
    });
    this.onMessage("getDuels", (client, message) => {
      // Transpose map to array because of send(message);
      const RoomId = this.duels.get(message.clientId);
      this.broadcast("getDuels", { RoomId: RoomId });
    });
  }

  onJoin(client: Client, options: any, auth: any) {
    console.log("DuelRoom -> Client joined !");
  }

  onLeave(client: Client, consented: boolean) {
    console.log("DuelRoom -> Client left !");
  }

  onDispose() {
    console.log("DuelRoom -> Disposed !");
  }
}
