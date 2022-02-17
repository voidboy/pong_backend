//
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
//
// GENERATED USING @colyseus/schema 1.0.32
//

import {
  Schema,
  type,
  ArraySchema,
  MapSchema,
  SetSchema,
  DataChange,
} from "@colyseus/schema";

export class Id extends Schema {
  constructor() {
    super();
    this.idRight = 0;
    this.idLeft = 0;
  }
  @type("number") public idLeft: number = 0;
  @type("number") public idRight: number = 0;
}
