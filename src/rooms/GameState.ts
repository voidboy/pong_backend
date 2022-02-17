import { Schema, type } from "@colyseus/schema";
import { Player } from "./Player";
import { Ball } from "./Ball";
import { Point } from "./Point";
import { Id } from "./Id";

/* 
  Game will be played inside a 854x480(480p 16:9 ratio) "window" on the server 
  side, client may apply a scale factor to match their own resolution.

  Pong specifications : 

  * paddle dimension: 15x70
  * leftPlayer position: 15x205
  * rightPlayer position: 824x205
  * ball dimension: 15x15 
*/

export class GameState extends Schema {
  @type(Player)
  leftPlayer: Player;
  @type(Player)
  rightPlayer: Player;
  @type(Ball)
  ball: Ball;
  @type(Id)
  ids: Id;

  constructor(
    leftPlayer = new Player(new Point(15, 205)),
    rightPlayer = new Player(new Point(824, 205)),
    ids = new Id()
  ) {
    super();
    this.leftPlayer = leftPlayer;
    this.rightPlayer = rightPlayer;
    this.ids = ids;
  }
}
