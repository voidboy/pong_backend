import { Room, Client } from "colyseus";
import { GameState } from "./GameState";
import { Ball } from "./Ball";
import { Player } from "./Player";
import * as CONF from "./GameConfig";
import * as jwt from "jsonwebtoken";
import { post } from "httpie";
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
import { GameInfos, Session } from "./GameInfos";

let players: undefined | Map<number, Session> = undefined;

export class GameRoom extends Room<GameState> {
  private inf: GameInfos = new GameInfos();

  private cleanup(): void {
    this.broadcast("gameend", {
      Winner: {
        score:
          this.state.leftPlayer.score === 3
            ? this.state.leftPlayer.score
            : this.state.rightPlayer.score,
        side: this.state.leftPlayer.score === 3 ? "left" : "right",
      },
      Looser: {
        score:
          this.state.rightPlayer.score !== 3
            ? this.state.rightPlayer.score
            : this.state.leftPlayer.score,
        side: this.state.leftPlayer.score === 3 ? "right" : "left",
      },
    });
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
      ball.velocity.x *= -1.05;
      ball.velocity.y =
        CONF.BALL_YVELOCITY * (bounce / (CONF.PADDLE_HEIGHT / 2));
    }
  }

  onCreate(options: any) {
    players = options.players;
    this.inf.LeftPlayer = options.id1;
    this.inf.RightPlayer = options.id2;
    this.setState(new GameState());
    /* increase patchrate to reach 60 FPS */
    this.setPatchRate(16);

    this.clock.setTimeout(() => {
      if (!this.inf.leftReady || !this.inf.rightReady) {
        this.disconnect();
      }
    }, 20000);
    this.onMessage("getGameInfo", (client, message) => {
      client.send("getGameInfo", this.inf);
    });
    this.onMessage("position", (client, message) => {
      client.send("position", this.inf.position ? "right" : "left");
      this.inf.position = !this.inf.position;
    });
    this.onMessage("moveleft", (client, message) => {
      this.state.leftPlayer.pos.y = message;
    });
    this.onMessage("moveright", (client, message) => {
      this.state.rightPlayer.pos.y = message;
    });
    this.onMessage("ready", (client, message) => {
      if (message === "left") this.inf.leftReady = true;
      if (message === "right") this.inf.rightReady = true;
      if (this.inf.rightReady && this.inf.leftReady) {
        this.broadcast("ready", {});
        this.setSimulationInterval((deltatime) => {
          this.simulate();
        });
      }
    });
    this.onMessage("cancelgame", (client, message) => {
      this.broadcast("cancelgame", message);
    });
    console.log("A gameRoom is created !");
  }

  onJoin(client: Client, options: any) {
    players.set(0, { roomId: "0", sessionId: "0" });
    console.log("onJoin GameRoom : ", players.size);
    console.log(this.roomId, " - GameRoom - join!");
  }

  onLeave(client: Client, consented: boolean) {
    players.delete(0);
    console.log("onLeave GameRoom : ", players.size);
    console.log(client.sessionId, "- GameRoom - left!");
  }

  async onDispose() {
    console.log("GameRoom disposed !");
    return post("http://localhost:3000/api/game/create-game", {
      headers: {
        authorization: "bearer " + jwt.sign({}, "tr_secret_key"),
      },
      body: {
        category: "RANKED",
        winner: this.inf.LeftPlayer.id,
        loser: this.inf.RightPlayer.id,
        score_loser: 0,
        score_winner: 11,
      },
    });
  }
}
