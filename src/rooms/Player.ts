import { Schema, type } from "@colyseus/schema";
import { Point } from "./Point";

export class Player extends Schema {
  @type(Point)
  pos: Point;
  @type("number")
  score: number;
  width: number = 15;
  height: number = 70;

  constructor(pos = new Point(0, 0), score = 0) {
    super();
    this.pos = pos;
    this.score = 0;
  }

  get left(): number {
    return this.pos.x - this.width / 2;
  }

  get right(): number {
    return this.pos.x + this.width / 2;
  }

  get top(): number {
    return this.pos.y - this.height / 2;
  }

  get bot(): number {
    return this.pos.y + this.height / 2;
  }
}