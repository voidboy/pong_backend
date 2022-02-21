import { Room, Client, Delayed, matchMaker } from "colyseus";

interface MatchGroup {
  joinedClients: ClientInfo[];
  ready?: boolean;
}

interface ClientInfo {
  client: Client;
  waitingTime: number;
  group?: MatchGroup;
  rank?: number;
  rankRange?: number;
  confirmed: boolean;
  id?: number;
}

export class MatchMakingRoom extends Room {
  // List of clients in the 'queue' MatchMaking
  AllClients: ClientInfo[] = [];

  // Groups made by the MatchMaking algo that we want
  groups: MatchGroup[] = [];

  constructor() {
    super();
  }

  onCreate() {
    // this.onMessage("confirm", (client: Client, message: any) => {
    //   const foundClient = this.AllClients.find(
    //     (AllClient) => AllClient.client === client
    //   );
    //   if (foundClient && foundClient.group) {
    //     foundClient.confirmed = true;
    //     foundClient.client.leave();
    //   }
    // });
    this.onMessage("id", (client, message) => {
      const foundClient = this.AllClients.find(
        (AllClient) => AllClient.client === client
      );
      foundClient.id = message;
    });
    this.setSimulationInterval(() => this.makeGroups(), 2000);
  }

  onJoin(client: Client, options: any) {
    console.log("New Client Joined MatchMakingRoom !");
    this.AllClients.push({
      client: client,
      waitingTime: 0,
      confirmed: false,
    });
  }

  createGroup() {
    let group: MatchGroup = { joinedClients: [], ready: false };
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

      // Maybe implement a MaxWaitingTime and force the
      // client to join a group with high diff rank
      if (client.waitingTime > 30000)
        console.log("client[", i, "].waitingTime > 30sec");

      // Add client to group and add group to client
      client.group = currentGroup;
      currentGroup.joinedClients.push(client);

      // We want to match 2 clients so length must be 2
      if (currentGroup.joinedClients.length === 2) {
        // In that case we set ready statement to true
        // and we reset currentGroup to continue our ForLoop
        currentGroup.ready = true;
        currentGroup = this.createGroup();
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
            id: client.id,
          });
        });
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
