import { Room, Client, matchMaker } from "colyseus";

export class DuelRoom extends Room {
  // Map to store duels => K = nickname, V = RoomId
  duels = new Map<number, any>();

  onCreate(options: any) {
    console.log("DuelRoom created -> ", this.roomId);
    this.onMessage("addDuel", async (client, message) => {
      let newRoom = await matchMaker.createRoom("gameRoom", {});
      this.duels.set(message.id, newRoom);
    });
    this.onMessage("getDuels", async (client, message) => {
      // Get room in map
      const newRoom = this.duels.get(message.clientId);
      // Reserve two seats for players
      const reservation1 = await matchMaker.reserveSeatFor(newRoom, {});
      const reservation2 = await matchMaker.reserveSeatFor(newRoom, {});
      // Send reservations to clients
      this.broadcast("getDuels", {
        clientId: message.clientId,
        reservation1: reservation1,
        reservation2: reservation2,
      });
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
