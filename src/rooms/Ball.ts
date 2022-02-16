import { Schema, type } from "@colyseus/schema";
import { Point } from "./Point";

export class Ball extends Schema {
  @type(Point)
  pos: Point;
  @type(Point)
  velocity: Point;
  width: number = 15;
  height: number = 15;

  constructor(pos = new Point(0, 0), velocity = new Point(0, 0)) {
    super();
    this.pos = pos;
    this.velocity = velocity;
  }
}