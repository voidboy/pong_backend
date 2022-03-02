export class GameInfos {

  public leftReady: boolean = false;
  public rightReady: boolean = false;
  public position: boolean = false;
  public LeftPlayer!: any;
  public RightPlayer!: any;
  constructor() {}
}

export interface Session {
  roomId: string;
  sessionId: string;
};


// export interface User {
//   id: number;
//   nickname: string;
//   avatar: string;
//   points: number;
// }