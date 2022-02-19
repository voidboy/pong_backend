import { Room, Client } from "colyseus";
import { GameState } from "./GameState";
import { Ball } from "./Ball";
import { Player } from "./Player";
import * as CONF from "./GameConfig";
import {
  ballTop,
  ballBot,
  ballRight,
  ballReset,
  ballLeft,
  playerTop,
  playerBot,
  playerRight,
  playerLeft,
} from "./utils";

export class GameRoom extends Room<GameState> {
  private leftReady: boolean = false;
  private rightReady: boolean = false;
  private position: boolean = false;

  private simulate() {
    const Lplayer: Player = this.state.leftPlayer;
    const Rplayer: Player = this.state.rightPlayer;
    const ball: Ball = this.state.ball;

    ball.pos.x += ball.velocity.x * (1 / 60);
    ball.pos.y += ball.velocity.y * (1 / 60);
    if (ballTop(ball) <= 0 || ballBot(ball) >= CONF.GAME_HEIGHT) {
      ball.velocity.y *= -1;
    } else if (ballRight(ball) >= CONF.GAME_WIDTH) {
      Lplayer.score += 1;
      ballReset(ball);
    } else if (ballLeft(ball) <= 0) {
      /* right player scored a point */
      Rplayer.score += 1;
      ballReset(ball);
    } else if (
      playerTop(Lplayer) < ballBot(ball) &&
      playerBot(Lplayer) > ballTop(ball)
    ) {
      /* if a collision happens, ball may be "inside" the paddle due
        to his deplacement computation (time * velocity), to prevent that
        we must put back the ball in front of the paddle */
      if (playerRight(Lplayer) >= ballLeft(ball)) {
        const bounce: number = ball.pos.y - Lplayer.pos.y;
        //ball.pos.x = playerRight(Lplayer) + CONF.BALL_WIDTH / 2 + 1;
        /* add %5 to ball's speed each time it hits a player */
        ball.velocity.x *= -1.05;
        ball.velocity.y =
          CONF.BALL_YVELOCITY * (bounce / (CONF.PADDLE_HEIGHT / 2));
      }
    } else if (
      playerTop(Rplayer) < ballBot(ball) &&
      playerBot(Rplayer) > ballTop(ball)
    ) {
      if (playerLeft(Rplayer) <= ballRight(ball)) {
        const bounce: number = ball.pos.y - Rplayer.pos.y;
        //ball.pos.x = playerLeft(Rplayer) - CONF.BALL_WIDTH / 2 - 2;
        ball.velocity.x *= -1.05;
        ball.velocity.y =
          CONF.BALL_YVELOCITY * (bounce / (CONF.PADDLE_HEIGHT / 2));
      }
    }
  }

  onCreate(options: any) {
    this.setState(new GameState());
    /* increase patchrate to reach 60 FPS */
    this.setPatchRate(16);

    this.onMessage("position", (client, message) => {
      client.send("position", this.position ? "right" : "left");
      this.position = !this.position;
    });
    this.onMessage("moveleft", (client, message) => {
      // console.log("left -> ", message);
      this.state.leftPlayer.pos.y = message;
    });
    this.onMessage("moveright", (client, message) => {
      // console.log("right -> ", message);
      this.state.rightPlayer.pos.y = message;
    });
    this.onMessage("ready", (client, message) => {
      if (message === "left") this.leftReady = true;
      if (message === "right") this.rightReady = true;
      if (this.rightReady && this.leftReady) {
        this.setSimulationInterval((deltatime) => {
          this.simulate();
        });
      }
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "join!");
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
