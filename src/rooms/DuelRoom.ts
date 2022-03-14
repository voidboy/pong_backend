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

  private client_mapping = new Map<Client, string>();

  onCreate(options: any) {
    console.log("DuelRoom -> OnCreate()");
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
    this.onMessage("cancel", (client, message) => {
      const client_id = this.client_mapping.get(client);

      const player = users.get(client_id);
      if (player) {
        player.setState("IDLE");
        client.leave();
      }
    });
    // Push in users map
    const player = users.get(user.data.id);
    if (player && player.stateValue === "IDLE") {
      player.setState("WAITING_DUEL");
      this.AllClients.set(user.data.id, {
        client: client,
        data: user.data,
      });
      this.client_mapping.set(client, user.data.id);
      if (user.data.id === options.id1) {
        const opponent = users.get(options.id2);
        if (!opponent || opponent.stateValue !== "WAITING_DUEL") return;
      } else if (user.data.id === options.id2) {
        const opponent = users.get(options.id1);
        if (!opponent || opponent.stateValue !== "WAITING_DUEL") {
          player.setState("IDLE");
          player.client.send("duel-expired");
          return;
        }
      }
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
        //client.client.leave();
        const player = users.get(client.data.id);
        if (player) {
          player.setState("IN_ACCEPT");
          player.roomId = newRoom.roomId;
          player.sessionId = reservation.sessionId;
        }
        s.push(reservation.sessionId);
      });
      rooms.set(newRoom.roomId, s);
    } else if (player) {
      const current_state = player.stateValue;
      if (current_state === "IN_DUEL" || current_state === "IN_RANKED") {
        player.client.send("state_incompatible", {
          state: current_state,
          roomId: player.roomId,
          sessionId: player.sessionId,
        });
      } else if (current_state === "WAITING_DUEL") {
        const curr_player = this.AllClients.get(user.data.id);
        if (curr_player) {
          curr_player.client.leave();
          this.client_mapping.delete(curr_player.client);
          this.client_mapping.set(client, curr_player.data.id);
          curr_player.client = client;
        }
      } else if (current_state === "WAITING_RANKED") {
        player.client.send("state_incompatible", {
          state: "WAITING_RANKED",
        });
      }
    } else {
      client.error(4042, "You must connect to serviceRoom first.");
      return client.leave();
    }
    console.log("New Client Joined DuelRoom ! ", client.sessionId);
  }

  onLeave(client: Client, consented: boolean) {
    console.log("DuelRoom -> Client left");
    this.AllClients.forEach((val: ClientInfo, key) => {
      if (val.client === client) this.AllClients.delete(key);
    });
  }

  onDispose() {
    console.log("DuelRoom -> onDispose()");
  }
}
