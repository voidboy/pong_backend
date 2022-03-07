export class GameInfos {

  LeftPlayer!: any;
  RightPlayer!: any;
  constructor() {}
}

export interface Session {
  roomId: string;
  sessionId: string;
};