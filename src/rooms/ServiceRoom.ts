import { Room, Client, ServerError, matchMaker } from "colyseus";
import * as jwt from "jsonwebtoken";
import { get } from "httpie";
import { Session, State } from "./GameInfos";
import { Subject } from "rxjs";

let users: undefined | Map<string, Session> = undefined;
let rooms: undefined | Map<string, Array<string>> = undefined;
let connected: undefined | Set<string> = undefined;

export class ServiceRoom extends Room {
  private client_mapping = new Map<Client, string>();

  onCreate(options: any) {
    console.log("ServiceRoom -> OnCreate()");
    users = options.users;
    rooms = options.rooms;
    connected = options.connected;
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
    console.log("ServiceRoom -> Client Joined");
    const token: string = options.authorization.split(" ")[1];
    const user = await get("http://localhost:3000/api/user", {
      headers: {
        authorization: "bearer " + token,
      },
    });

    const player = users.get(user.data.id);

    if (player === undefined) {
      console.log("FIRST CONNECTION -> ", user.data.id);
      users.set(user.data.id, new Session(user, client, "IDLE"));
    } else {
      console.log("ALREADY CONNECTED -> ", user.data.id);
      client.send("already-connected", {});
    }

    this.client_mapping.set(client, user.data.id);
  }

  onLeave(client: Client, consented: boolean) {
    const deleted_id = this.client_mapping.get(client);
    /* A REFAIRE POUR DOUBLE ONGLETS */
    this.client_mapping.delete(client);
    console.log("ServiceRoom -> Client left");
    let doNotDelete = false;
    this.client_mapping.forEach((val, key) => {
      /* If they are multiples client connected with the 
      same account, do not delete it from users, keep the
      user until there is only 1 client linked to it */
      if (val === deleted_id) doNotDelete = true;
    });
    if (!doNotDelete) users.delete(deleted_id);
  }

  onDispose() {
    console.log("ServiceRoom -> onDispose()");
  }
}
