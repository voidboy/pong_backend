import { Room, Client, matchMaker, ServerError } from "colyseus";
import { get } from "httpie";
import * as jwt from "jsonwebtoken";
import { Session } from "./GameInfos";

interface MatchGroup {
  joinedClients: ClientInfo[];
  ready: boolean;
  averageRank: number;
  isDuel?: boolean;
  idForDuel?: number;
  customisationDuel?: any;
}

interface ClientInfo {
  client: Client;
  waitingTime: number;
  group?: MatchGroup;
  rank?: number;
  rankRange?: number;
  confirmed: boolean;
  data?: any;
  isDuel: boolean;
  idForDuel: number;
  customisationDuel?: any;
}

let users: undefined | Map<string, Session> = undefined;
let rooms: undefined | Map<string, Array<string>> = undefined;

export class MatchMakingRoom extends Room {
  // List of clients in the 'queue' MatchMaking
  AllClients: ClientInfo[] = [];

  // Groups made by the MatchMaking algo that we want
  groups: MatchGroup[] = [];
  duelGroups: MatchGroup[] = [];

  constructor() {
    super();
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

  onCreate(options: any) {
    users = options.users;
    rooms = options.rooms;
    this.setSimulationInterval(() => this.makeGroups(), 500);
  }

  async onJoin(client: Client, options: any) {
    const token: string = options.authorization.split(" ")[1];
    const user = await get("http://localhost:3000/api/user", {
      headers: {
        authorization: "bearer " + token,
      },
    });
    /* here, we must check if client is not already playing a game, if so,
    we must transfer him back his game information which will allow him to 
    reconnect to his GameRoom and continue playing
    */

    const ongoing = users.get(user.data.id);
    if (ongoing !== undefined) {
      client.send("ongoing", ongoing);
    } else {
      console.log("New Client Joined MatchMakingRoom ! ", client.sessionId);
      let newClient = {
        client: client,
        waitingTime: 0,
        confirmed: false,
        rankRange: 0,
        data: user.data,
        rank: user.data.ladder.points,
        isDuel: options.isDuel,
        idForDuel: options.idForDuel,
        customisationDuel: options.customisation,
      };
      this.AllClients.push(newClient);
    }
  }

  createGroup() {
    let group: MatchGroup = {
      joinedClients: [],
      ready: false,
      averageRank: 0,
      isDuel: false,
      customisationDuel: undefined,
    };
    this.groups.push(group);
    return group;
  }

  makeGroups() {
    // Reset all groups to initialize a new pool and reset everything
    this.groups = [];

    let currentGroup: MatchGroup = this.createGroup();
    /* === Check for every client => matchable with rank and waitingTime === */
    for (let i = 0; i < this.AllClients.length; i++) {
      const client = this.AllClients[i];

      if (client.group && client.group.ready === true) continue;

      if (client.isDuel) {
        if (
          currentGroup.isDuel === true &&
          currentGroup.joinedClients.length === 1 &&
          currentGroup.idForDuel === client.idForDuel
        ) {
          currentGroup.joinedClients.push(client);
          client.group = currentGroup;
          currentGroup.ready = true;
          currentGroup = this.createGroup();
        } else if (
          currentGroup.isDuel === false &&
          currentGroup.joinedClients.length === 0
        ) {
          currentGroup.joinedClients.push(client);
          client.group = currentGroup;
          currentGroup.isDuel = true;
          currentGroup.idForDuel = client.idForDuel;
          currentGroup.customisationDuel = client.customisationDuel;
        }
        continue;
      }
      // Increment waiting time
      client.waitingTime += this.clock.deltaTime;

      // Skip clients that are already in a ready group (full group)

      // Everytime a client has waited more than 5 seconds,
      // we increment rankRange to find match eventually
      if (client.waitingTime > 5000) {
        client.rankRange += 50;
        client.waitingTime = 0;
      }

      // Handle Rank in groups
      if (currentGroup.averageRank > 0) {
      }

      // Add client to group and add group to client
      client.group = currentGroup;
      currentGroup.joinedClients.push(client);

      // We want to match 2 clients so length must be 2
      if (!currentGroup.isDuel && currentGroup.joinedClients.length === 2) {
        let rank1 = currentGroup.joinedClients[0].rank;
        let rank2 = currentGroup.joinedClients[1].rank;
        const GroupRankDiff = rank1 > rank2 ? rank1 - rank2 : rank2 - rank1;
        if (client.rankRange > GroupRankDiff) {
          currentGroup.ready = true;
          currentGroup = this.createGroup();
        }
      }
    }
    /*
     ** Now that this.groups is filled
     ** Time to check if we can create GameRooms
     ** For our clients that we matched
     */

    //console.log(this.groups);

    this.createRoomsForReadyGroups();
  }

  /* Make it async to use await and be sure the room is created before its use */
  async createRoomsForReadyGroups() {
    this.groups.map(async (group) => {
      if (group.ready) {
        const s = new Array<string>();
        console.log("MatchMakingRoom -> A group is ready, creating gameRooom");
        const newRoom = await matchMaker.createRoom("gameRoom", {
          p1: group.joinedClients[0].data,
          p2: group.joinedClients[1].data,
          gameMode: group.isDuel ? "DUAL" : "RANKED",
          customisation: group.customisationDuel,
        });
        group.joinedClients.map(async (client) => {
          const reservation = await matchMaker.reserveSeatFor(newRoom, {
            self: client,
          });
          client.client.send("seat", reservation);
          client.client.leave();
          users.set(client.data.id, {
            roomId: reservation.room.roomId,
            sessionId: reservation.sessionId,
          });
          s.push(reservation.sessionId);
        });
        rooms.set(newRoom.roomId, s);
      }
    });
  }

  onLeave(client: Client, consented: boolean) {
    const index = this.AllClients.findIndex((cli) => cli.client === client);
    this.AllClients.splice(index, 1);
    console.log("MatchMakingRoom -> Client left");
  }

  onDispose() {
    console.log("MatchMakingRoom -> disposing...");
  }
}
