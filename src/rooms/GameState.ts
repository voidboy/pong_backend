import { Schema, type } from "@colyseus/schema";
import { Player } from "./Player";
import { Ball } from "./Ball";
import { Point } from "./Point";
import * as CONF from "./GameConfig";
import { Id } from "./Id";
import { GameCategory } from "/Users/fgomez/Desktop/ft_transcendense/api_infinity/src/database/entities/game.entity";
import { GameRoom } from "./GameRoom";
import { User } from "./User";

export class GameState extends Schema {
  @type(Player)
  leftPlayer: Player;
  @type(Player)
  rightPlayer: Player;
  @type(Ball)
  ball: Ball;
  @type("string")
  token: string;
  @type("number")
  score_w: number;
  score_l: number;

  category: GameCategory;
  @type(User)
  dataLeft: User;
  @type(User)
  dataRight: User;

  constructor(
    leftPlayer = new Player(
      new Point(CONF.PADDLE_WIDTH + CONF.PADDLE_WIDTH / 2, CONF.GAME_HEIGHT / 2)
    ),
    rightPlayer = new Player(
      new Point(
        CONF.GAME_WIDTH - (CONF.PADDLE_WIDTH + CONF.PADDLE_WIDTH / 2),
        CONF.GAME_HEIGHT / 2
      )
    ),
    ball = new Ball(
      new Point(CONF.GAME_WIDTH / 2, CONF.GAME_HEIGHT / 2),
      new Point(CONF.BALL_XVELOCITY, CONF.BALL_YVELOCITY)
    ),
    dataLeft = new User(),
    dataRight = new User()
  ) {
    super();
    this.leftPlayer = leftPlayer;
    this.rightPlayer = rightPlayer;
    this.ball = ball;
    this.dataLeft = dataLeft;
    this.dataRight = dataRight;
  }
}
