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

let users: undefined | Map<string, Session> = undefined;
let rooms: undefined | Map<string, Array<string>> = undefined;

export class GameRoom extends Room<GameState> {
  private inf: GameInfos = new GameInfos();

  private cleanup(): void {
    this.broadcast("gameend", {
      Winner: {
        score:
          this.state.leftPlayer.score === CONF.WIN_SCORE
            ? this.state.leftPlayer.score
            : this.state.rightPlayer.score,
        side: this.state.leftPlayer.score === CONF.WIN_SCORE ? "left" : "right",
      },
      Looser: {
        score:
          this.state.rightPlayer.score !== CONF.WIN_SCORE
            ? this.state.rightPlayer.score
            : this.state.leftPlayer.score,
        side: this.state.leftPlayer.score === CONF.WIN_SCORE ? "right" : "left",
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
      if (Lplayer.score === CONF.WIN_SCORE) this.cleanup();
      ballReset(ball);
    } else if (ballLeft(ball) <= 0) {
      /* right player scored a point */
      Rplayer.score += 1;
      if (Rplayer.score === CONF.WIN_SCORE) this.cleanup();
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
    const side: boolean = Math.random() > 0.5 ? true : false;
    this.inf.LeftPlayer = side ? options.p1 : options.p2;
    this.inf.RightPlayer = side ? options.p2 : options.p1;

    users = options.users;
    rooms = options.rooms;
    this.setState(new GameState());
    this.setPatchRate(16);

    this.clock.setTimeout(() => {
      if (!this.inf.leftReady || !this.inf.rightReady) {
        this.disconnect();
      }
    }, 20000);
    this.onMessage("getGameInfo", (client, message) => {
      client.send("getGameInfo", this.inf);
    });
    this.onMessage("move", (client, message) => {
      if (client.sessionId === this.inf.leftSessionId)
        this.state.leftPlayer.pos.y = message;
      if (client.sessionId === this.inf.rightSessionId)
        this.state.rightPlayer.pos.y = message;
    });
    this.onMessage("ready", (client, message) => {
      if (client.sessionId === this.inf.leftSessionId)
        this.inf.leftReady = true;
      if (client.sessionId === this.inf.rightSessionId)
        this.inf.rightReady = true;
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
    if (rooms.get(this.roomId).find((id) => id === client.sessionId)) {
      const player_id = options.self.data.id;
      if (player_id === this.inf.RightPlayer.id) {
        client.send("position", "right");
        this.inf.rightSessionId = client.sessionId;
      }
      if (player_id === this.inf.LeftPlayer.id) {
        client.send("position", "left");
        this.inf.leftSessionId = client.sessionId;
      }
      console.log(player_id, " - GameRoom - join!");
    }
  }

  async onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "- GameRoom - left!");
    // flag client as inactive for other users
    //this.state.players.get(client.sessionId).connected = false;
  
    try {
      if (consented) {
          throw new Error("consented leave");
      }
      // allow disconnected client to reconnect into this room until 20 seconds
      await this.allowReconnection(client, 20);
  
      // client returned! let's re-activate it.
      //this.state.players.get(client.sessionId).connected = true;
  
    } catch (e) {
  
      // 20 seconds expired. let's remove the client.
      //this.state.players.delete(client.sessionId);
    }
  }

  async onDispose() {

    /* cleanup room entry */
    rooms.delete(this.roomId);
    /* free users from link */
    users.delete(this.inf.LeftPlayer.id);
    users.delete(this.inf.RightPlayer.id);

    console.log("GameRoom disposed !");
    const winner =
      this.inf.LeftPlayer.score > this.inf.RightPlayer.score
        ? this.inf.LeftPlayer
        : this.inf.RightPlayer;
    const looser =
      this.inf.LeftPlayer.score < this.inf.RightPlayer.score
        ? this.inf.LeftPlayer
        : this.inf.RightPlayer;
    return post("http://localhost:3000/api/game/create-game", {
      headers: {
        authorization: "bearer " + jwt.sign({}, "tr_secret_key"),
      },
      body: {
        category: "RANKED",
        winner: winner.id,
        loser: looser.id,
        score_loser: winner.score,
        score_winner: looser.score,
      },
    });
  }
}
