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
  debugPlayer,
  debugBall,
} from "./utils";
import { post } from "httpie";

export class GameRoom extends Room<GameState> {
  private leftReady: boolean = false;
  private rightReady: boolean = false;
  private position: boolean = false;

  private cleanup(): void {
    this.broadcast("gameend", {});
    this.disconnect().then((foo) => {
      console.log("all clients have been disconnected");
    });
  }

  /* Simulate a Pong loop cycle, return either true or false
  if simulation needs to stop or continue */
  private simulate(): void {
    const Lplayer: Player = this.state.leftPlayer;
    const Rplayer: Player = this.state.rightPlayer;
    const ball: Ball = this.state.ball;

    ball.pos.x += ball.velocity.x * (1 / 60);
    ball.pos.y += ball.velocity.y * (1 / 60);
    if (ballTop(ball) <= 0) {
      if (ball.pos.y < 0) ball.pos.y = 0;
      ball.velocity.y *= -1;
    } else if (ballBot(ball) >= CONF.GAME_HEIGHT) {
      if (ball.pos.y > CONF.GAME_HEIGHT) ball.pos.y = CONF.GAME_HEIGHT;
      ball.velocity.y *= -1;
    } else if (ballRight(ball) >= CONF.GAME_WIDTH) {
      Lplayer.score += 1;
      if (Lplayer.score === 3) this.cleanup();
      ballReset(ball);
    } else if (ballLeft(ball) <= 0) {
      /* right player scored a point */
      Rplayer.score += 1;
      if (Rplayer.score === 3) this.cleanup();
      ballReset(ball);
    } else if (
      playerTop(Lplayer) < ballBot(ball) &&
      playerBot(Lplayer) > ballTop(ball) &&
      playerRight(Lplayer) >= ballLeft(ball)
    ) {
      if (playerRight(Lplayer) > ballLeft(ball))
        ball.pos.x = playerRight(Lplayer) + CONF.BALL_WIDTH / 2;
      /* if a collision happens, ball may be "inside" the paddle due
        to his deplacement computation (time * velocity), to prevent that
        we must put back the ball in front of the paddle */
      const bounce: number = ball.pos.y - Lplayer.pos.y;
      //ball.pos.x = playerRight(Lplayer) + CONF.BALL_WIDTH / 2 + 1;
      /* add %5 to ball's speed each time it hits a player */
      ball.velocity.x *= -1.05;
      ball.velocity.y =
        CONF.BALL_YVELOCITY * (bounce / (CONF.PADDLE_HEIGHT / 2));
    } else if (
      playerTop(Rplayer) < ballBot(ball) &&
      playerBot(Rplayer) > ballTop(ball) &&
      playerLeft(Rplayer) <= ballRight(ball)
    ) {
      if (playerLeft(Rplayer) <= ballRight(ball))
        ball.pos.x = playerLeft(Rplayer) - CONF.BALL_WIDTH / 2;
      const bounce: number = ball.pos.y - Rplayer.pos.y;
      //ball.pos.x = playerLeft(Rplayer) - CONF.BALL_WIDTH / 2 - 2;
      ball.velocity.x *= -1.05;
      ball.velocity.y =
        CONF.BALL_YVELOCITY * (bounce / (CONF.PADDLE_HEIGHT / 2));
    }
    if (Lplayer.score == 11) {
      this.state.score_w = Lplayer.score;
      this.state.score_l = Rplayer.score;
      this.disconnect();
    } else if (Rplayer.score == 11) {
      this.state.score_w = Rplayer.score;
      this.state.score_l = Lplayer.score;
      this.disconnect();
    }
  }

  onCreate(options: any) {
    this.setState(new GameState());
    /* increase patchrate to reach 60 FPS */
    this.setPatchRate(16);

    this.clock.setTimeout(() => {
      if (!this.leftReady || !this.rightReady) {
        this.disconnect();
      }
    }, 3000);
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
        this.broadcast("ready", {});
        this.setSimulationInterval((deltatime) => {
          this.simulate();
        });
      }
    });
    this.onMessage("id", (client, message) => {
      console.log("ID POS -> ", this.position);
      if (this.position) {
        this.state.dataLeft.id = message.id;
        this.state.dataLeft.avatar = message.avatar;
        this.state.dataLeft.nickname = message.nickname;
        this.state.dataLeft.points = message.ladder?.points;
      } else {
        this.state.dataRight.id = message.id;
        this.state.dataRight.avatar = message.avatar;
        this.state.dataRight.nickname = message.nickname;
        this.state.dataRight.points = message.ladder?.points;
      }
    });
    this.onMessage("category", (client, message) => {
      this.state.category = message;
    });
    this.onMessage("ready", (client, message) => {
      if (message === "left") this.leftReady = true;
      if (message === "right") this.rightReady = true;
      if (this.rightReady && this.leftReady) {
        this.broadcast("ready", {});
        this.setSimulationInterval((deltatime) => {
          this.simulate();
        });
      }
    });
    this.onMessage("id", (client, message) => {
      console.log("ID POS -> ", this.position);
      if (this.position) {
        this.state.dataLeft.id = message.id;
        this.state.dataLeft.avatar = message.avatar;
        this.state.dataLeft.nickname = message.nickname;
        this.state.dataLeft.points = message.ladder?.points;
      } else {
        this.state.dataRight.id = message.id;
        this.state.dataRight.avatar = message.avatar;
        this.state.dataRight.nickname = message.nickname;
        this.state.dataRight.points = message.ladder?.points;
      }
    });
    this.onMessage("cancelgame", (client, message) => {
      this.broadcast("cancelgame", message);
    });
    console.log("A gameRoom is created !");
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "gameRoom -> join!");
  }

  async onLeave(client: Client, consented: boolean) {
    try {
      const reconnection = await this.allowReconnection(client, 10);
    } catch (e) {
      if (client.sessionId == this.state.leftPlayer.id) {
        this.state.score_l = this.state.leftPlayer.score;
        this.state.score_w = this.state.rightPlayer.score;
      } else {
        this.state.score_l = this.state.rightPlayer.score;
        this.state.score_w = this.state.leftPlayer.score;
      }
      this.disconnect();
      client.send("disconnected");
    }
    console.log(client.sessionId, "left!");
  }

  async onDispose() {
    try {
      const res = await post("http://localhost:3000/api/game/create-game", {
        headers: {
          token: "bearer " + this.state.token,
        },
        body: {
          category: this.state.category,
          user1: this.state.dataLeft.id,
          user2: this.state.dataRight.id,
          score_w: this.state.score_w,
          score_l: this.state.score_l,
        },
      });
    } catch (e) {
      console.log(e);
    }
    console.log("room", this.roomId, "disposing...");
    console.log(this.roomId, " - GameRoom - join!");
  }
}
