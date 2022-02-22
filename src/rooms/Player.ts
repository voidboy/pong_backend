import { Schema, type } from "@colyseus/schema";
import { Point } from "./Point";

export class Player extends Schema {
  @type(Point)
  pos: Point;
  @type("number")
  score: number;
  @type("boolean")
  connected: boolean;
  id: string;

  constructor(pos = new Point(0, 0), score = 0) {
    super();
    this.pos = pos;
    this.score = 0;
    this.connected = true;
  }
}
