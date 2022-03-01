// FROM FRONTEND :
// export interface User {
//   id: number;
//   nickname: string;
//   avatar: string;
//   setting?: Setting;
//   ladder?: Ladder;
//   achievements?: Achievement[];
//   victories?: Game[];
//   defeats?: Game[];
//   friends?: User[];
//   blacklist?: User[];
//   history?: Game[];
//   actions_sent?: Action[];
//   actions_received?: Action[];
// }

import { Schema, type } from "@colyseus/schema";

export class User extends Schema {
  @type("number")
  id: number;
  @type("string")
  nickname: string;
  @type("string")
  avatar: string;
  @type("number")
  points: number;

  constructor(id = 0, nickname = "", avatar = "") {
    super();
    this.id = id;
    this.nickname = nickname;
    this.avatar = avatar;
  }
}
