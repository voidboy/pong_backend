import { Room, Client, ServerError, matchMaker } from "colyseus";
import { Session } from "./GameInfos";
import * as jwt from "jsonwebtoken";
import { get } from "httpie";

//                                 id1     id2
let duelsToMatch: undefined | Map<number, number> = undefined;

let users: undefined | Map<string, Session> = undefined;
let rooms: undefined | Map<string, Array<string>> = undefined;

interface ClientInfo {
  client: Client;
  data?: any;
}

export class DuelRoom extends Room {
  AllClients = new Map<number, ClientInfo>();

  onCreate(options: any) {
    console.log("DuelRoom -> OnCreate()");
    console.log("AllClients -> ", this.AllClients);
    users = options.users;
    rooms = options.rooms;
  }

  async onAuth(client, options, request): Promise<boolean> {
    try {
      const token: string = options.authorization.split(" ")[1];
      jwt.verify(token, "tr_secret_key");
      return true;
    } catch (e) {
      throw new ServerError(400, "bad access token");
    }
  }

  async onJoin(client: Client, options: any, auth: any) {
    console.log("DuelRoom -> Client Joined");
    const token: string = options.authorization.split(" ")[1];
    const user = await get("http://localhost:3000/api/user", {
      headers: {
        authorization: "bearer " + token,
      },
    });

    // Push in users map
    users.set(user.data.id, {
      roomId: undefined,
      sessionId: undefined,
      state: "WAITING_DUEL",
    });

    // Push client in tab of clients
    this.AllClients.set(user.data.id, {
      client: client,
      data: user.data,
    });

    const opponent = users.get(options.id2);
    if (!opponent || opponent.state !== "WAITING_DUEL") return;
    const group = [
      this.AllClients.get(options.id1),
      this.AllClients.get(options.id2),
    ];
    const newRoom = await matchMaker.createRoom("gameRoom", {
      p1: group[0].data,
      p2: group[1].data,
      gameMode: "DUEL",
      customisation: { ballSpeed: 1, ballColor: "#ffffff" },
    });
    const s = new Array<string>();
    group.map(async (client) => {
      const reservation = await matchMaker.reserveSeatFor(newRoom, {
        self: client,
      });
      client.client.send("seat", reservation);
      users.set(client.data.id, {
        roomId: reservation.room.roomIsd,
        sessionId: reservation.sessionId,
        state: "IN_DUEL",
      });
      s.push(reservation.sessionId);
    });
    rooms.set(newRoom.roomId, s);
  }

  onLeave(client: Client, consented: boolean) {
    console.log("DuelRoom -> Client left");
    // this.AllClients.clear();
  }

  onDispose() {
    console.log("DuelRoom -> onDispose()");
  }
}
