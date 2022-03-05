export class GameInfos {

  leftReady: boolean = false;
  rightReady: boolean = false;
  leftSessionId: string = '';
  rightSessionId: string = '';
  LeftPlayer!: any;
  RightPlayer!: any;
  constructor() {}
}

export interface Session {
  roomId: string;
  sessionId: string;
};