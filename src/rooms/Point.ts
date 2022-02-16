import { Schema, type } from "@colyseus/schema";

export class Point extends Schema {
  @type("number")
  x: number;
  @type("number")
  y: number;

  constructor(x = 0, y = 0) {
    super();
    this.x = x;
    this.y = y;
  }

  get norm(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  set norm(value: number) {
    const factor: number = value / this.norm;
    this.x *= factor;
    this.y *= factor;
  }
}