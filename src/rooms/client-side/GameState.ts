// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 1.0.32
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Player } from './Player'
import { Ball } from './Ball'

export class GameState extends Schema {
    @type(Player) public leftPlayer: Player = new Player();
    @type(Player) public rightPlayer: Player = new Player();
    @type(Ball) public ball: Ball = new Ball();
}
