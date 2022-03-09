export class GameInfos {
  LeftPlayer!: any;
  RightPlayer!: any;
  customisation!: any;
  constructor() {}
}

export interface Session {
  roomId: string;
  sessionId: string;
}
