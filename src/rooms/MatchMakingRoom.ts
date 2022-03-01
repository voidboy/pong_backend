import { Room, Client, matchMaker, ServerError } from "colyseus";
import * as jwt from "jsonwebtoken";

interface MatchGroup {
  joinedClients: ClientInfo[];
  ready: boolean;
  averageRank: number;
}

interface ClientInfo {
  client: Client;
  waitingTime: number;
  group?: MatchGroup;
  rank?: number;
  rankRange?: number;
  confirmed: boolean;
  data?: any;
}

let players: undefined | Map<string, Client> = undefined;

export class MatchMakingRoom extends Room {
  // List of clients in the 'queue' MatchMaking
  AllClients: ClientInfo[] = [];

  // Groups made by the MatchMaking algo that we want
  groups: MatchGroup[] = [];

  constructor() {
    super();
  }

  onAuth(client, options, request): boolean {
    try {
      const token: string = options.authorization.split(" ")[1];
      jwt.verify(token, "tr_secret_key");
      return true; // .verify will throw an Error if it fails
    } catch (e) {
      throw new ServerError(400, "bad access token");
    }
  }

  onCreate(options: any) {
    players = options.players;
    this.onMessage("id", (client, message) => {
      const foundClient = this.AllClients.find(
        (AllClient) => AllClient.client === client
      );
      foundClient.data = message;
      foundClient.rank = message.ladder?.points;
    });

    this.setSimulationInterval(() => this.makeGroups(), 2000);
  }

  onJoin(client: Client, options: any) {
    console.log("New Client Joined MatchMakingRoom !");
    players.set(client.sessionId, client);
    console.log('onJoin MatchRoom :', players.size);
    console.log(players);
    this.AllClients.push({
      client: client,
      waitingTime: 0,
      confirmed: false,
      rankRange: 0,
    });
  }

  createGroup() {
    let group: MatchGroup = { joinedClients: [], ready: false, averageRank: 0 };
    this.groups.push(group);
    return group;
  }

  makeGroups() {
    console.log("MatchMakingRoom -> Making groups every 2 sec");

    // Reset all groups to initialize a new pool and reset everything
    this.groups = [];

    let currentGroup: MatchGroup = this.createGroup();
    /* === Check for every client => matchable with rank and waitingTime === */
    for (let i = 0; i < this.AllClients.length; i++) {
      const client = this.AllClients[i];

      // Increment waiting time
      client.waitingTime += this.clock.deltaTime;

      // Skip clients that are already in a ready group (full group)
      if (client.group && client.group.ready === true) continue;

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
      if (currentGroup.joinedClients.length === 2) {
        let rank1 = currentGroup.joinedClients[0].rank;
        let rank2 = currentGroup.joinedClients[1].rank;
        const GroupRankDiff = rank1 > rank2 ? rank1 - rank2 : rank2 - rank1;
        console.log(
          "GroupRankRange -> ",
          GroupRankDiff,
          "User rankRange = ",
          client.rankRange
        );
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

    console.log(this.groups);

    this.createRoomsForReadyGroups();
  }

  /* Make it async to use await and be sure the room is created before its use */
  async createRoomsForReadyGroups() {
    this.groups.map(async (group) => {
      if (group.ready) {
        console.log("MatchMakingRoom -> A group is ready, creating gameRooom");
        const newRoom = await matchMaker.createRoom("gameRoom", {});
        group.joinedClients.map(async (client) => {
          const reservation = await matchMaker.reserveSeatFor(newRoom, {});
          client.client.send("seat", {
            reservation: reservation,
            data: client.data,
          });
          client.client.leave();
        });
      }
    });
  }

  onLeave(client: Client, consented: boolean) {
    players.delete(client.sessionId);
    console.log('onLeave MatchRoom :', players.size)
    const index = this.AllClients.findIndex((cli) => cli.client === client);
    this.AllClients.splice(index, 1);
    console.log("MatchMakingRoom -> Client left");
  }

  onDispose() {
    console.log("MatchMakingRoom -> disposing...");
  }
}
