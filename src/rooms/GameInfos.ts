import { Client } from "colyseus";
import { Subject } from "rxjs/internal/Subject";

export class GameInfos {
  LeftPlayer!: any;
  RightPlayer!: any;
  customisation!: any;
  constructor() {}
}

export class Session {
  user: any;
  client:  Client;
  stateValue: State;
  roomId: string;
  sessionId: string;

  setState(newState: State) {
    this.stateValue = newState;
    this.client.send('state', newState);
    console.log('this.client -> ', this.client.id, this.user.data.id);
  }

  constructor(user: any, client: Client, stateValue: State) {
    this.user = user;
    this.client = client;
    this.stateValue = stateValue
  }
}

export type State =
  | "IDLE"
  | "WAITING_RANKED"
  | "WAITING_DUEL"
  | "RECONNECTING"
  | "LOOKING"
  | "IN_RANKED"
  | "IN_DUEL";
