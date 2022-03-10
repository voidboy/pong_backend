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
let duels: undefined | Map<number, string> = undefined;

export class GameRoom extends Room<GameState> {
  private spc: number = 0;
  private cur: "wait" | "play" | "end" = "wait";
  private inf: GameInfos = new GameInfos();
  private Lid: string = "";
  private Rid: string = "";
  private Lgo: boolean = false;
  private Rgo: boolean = false;
  private gameMode: "RANKED" | "DUEL";

  private cleanup() {
    const winner =
      this.state.leftPlayer.score > this.state.rightPlayer.score || !this.Rgo
        ? this.inf.LeftPlayer
        : this.inf.RightPlayer;
    const looser =
      winner === this.inf.LeftPlayer
        ? this.inf.RightPlayer
        : this.inf.LeftPlayer;
    this.broadcast("gameend", {
      Winner: {
        score:
          winner === this.inf.LeftPlayer
            ? this.state.leftPlayer.score
            : this.state.rightPlayer.score,
        side: winner === this.inf.LeftPlayer ? "left" : "right",
      },
      Looser: {
        score:
          looser === this.inf.LeftPlayer
            ? this.state.leftPlayer.score
            : this.state.rightPlayer.score,
        side: looser === this.inf.LeftPlayer ? "left" : "right",
      },
    });
    this.cur = "end";
    this.disconnect();
  }

  /* Simulate a Pong loop cycle, return either true or false
  if simulation needs to stop or continue */
  private simulate(deltaTime: number): void {
    const Lplayer: Player = this.state.leftPlayer;
    const Rplayer: Player = this.state.rightPlayer;
    const ball: Ball = this.state.ball;

    ball.pos.x += ball.velocity.x * deltaTime;
    ball.pos.y += ball.velocity.y * deltaTime;
    if (ballTop(ball) <= 0) {
      ball.pos.y = CONF.BALL_HEIGHT / 2;
      ball.velocity.y *= -1;
    } else if (ballBot(ball) >= CONF.GAME_HEIGHT) {
      ball.pos.y = CONF.GAME_HEIGHT - CONF.BALL_HEIGHT / 2;
      ball.velocity.y *= -1;
    } else if (ballRight(ball) >= CONF.GAME_WIDTH) {
      Lplayer.score += 1;
      this.setMetadata({ Lscore: Lplayer.score });
      if (Lplayer.score === CONF.WIN_SCORE) this.cleanup();
      ballReset(ball, "right", this.inf.customisation.ballSpeed);
    } else if (ballLeft(ball) <= 0) {
      /* right player scored a point */
      Rplayer.score += 1;
      this.setMetadata({ Rscore: Rplayer.score });
      if (Rplayer.score === CONF.WIN_SCORE) this.cleanup();
      ballReset(ball, "left", this.inf.customisation.ballSpeed);
    } else if (
      playerTop(Lplayer) < ballBot(ball) &&
      playerBot(Lplayer) > ballTop(ball) &&
      playerRight(Lplayer) >= ballLeft(ball)
    ) {
      /* if a collision happens, ball may be "inside" the paddle due
        to his deplacement computation (time * velocity), to prevent that
        we must put back the ball in front of the paddle */
      if (playerRight(Lplayer) > ballLeft(ball))
        ball.pos.x = playerRight(Lplayer) + CONF.BALL_WIDTH / 2;
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
    this.inf.customisation = options.customisation;
    this.gameMode = options.gameMode;

    users = options.users;
    rooms = options.rooms;
    duels = options.duels;
    this.setState(new GameState());
    /* setup metadata for spectator game listing */
    this.setMetadata({
      left: this.inf.LeftPlayer,
      Lscore: 0,
      right: this.inf.RightPlayer,
      Rscore: 0,
      spectator: 0,
    });
    this.setPatchRate(16);

    this.clock.setTimeout(async () => {
      if ((!this.Lgo || !this.Rgo) && this.cur === "wait") {
        await this.disconnect();
      }
    }, 20000);
    this.onMessage("move", (client, message) => {
      if (client.sessionId === this.Lid) this.state.leftPlayer.pos.y = message;
      if (client.sessionId === this.Rid) this.state.rightPlayer.pos.y = message;
    });
    this.onMessage("ready", (client, message) => {
      if (client.sessionId === this.Lid) this.Lgo = true;
      if (client.sessionId === this.Rid) this.Rgo = true;
      if (this.Lgo && this.Rgo) {
        this.broadcast("ready", {});
        this.cur = "play";
        ballReset(
          this.state.ball,
          Math.random() > 0.5 ? "right" : "left",
          this.inf.customisation.ballSpeed
        );
        this.setSimulationInterval((deltaTime) => {
          this.simulate(deltaTime / 1000);
        });
      }
    });
    this.onMessage("cancelgame", (client, message) => {
      this.broadcast("cancelgame", message);
    });
    this.onMessage("giveup", async (client, message) => {
      let Winner = {};
      let Looser = {};
      if (client.sessionId === this.Lid) {
        Winner = {
          score: this.state.rightPlayer.score,
          side: "right",
        };
        Looser = {
          score: this.state.leftPlayer.score,
          side: "left",
        };
        this.Lgo = false;
      } else if (client.sessionId === this.Rid) {
        Winner = {
          score: this.state.leftPlayer.score,
          side: "left",
        };
        Looser = {
          score: this.state.rightPlayer.score,
          side: "right",
        };
        this.Rgo = false;
      }
      this.broadcast("gameend", {
        Winner: Winner,
        Looser: Looser,
      });
      this.cur = "end";
      await this.disconnect();
    });
    console.log("A gameRoom is created !");
  }

  onJoin(client: Client, options: any) {
    if (rooms.get(this.roomId).find((id) => id === client.sessionId)) {
      const player_id = options.self.data.id;
      if (player_id === this.inf.LeftPlayer.id) this.Lid = client.sessionId;
      if (player_id === this.inf.RightPlayer.id) this.Rid = client.sessionId;
    } else this.setMetadata({ spectator: ++this.spc });
    client.send("gameInfo", this.inf);
    console.log(client.sessionId, " - GameRoom - join!");
  }

  async onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "- GameRoom - left!");
    if (this.cur !== "play") return;
    if (client.sessionId === this.Rid) this.Rgo = false;
    else if (client.sessionId === this.Lid) this.Lgo = false;
    else return this.setMetadata({ spectator: --this.spc });
    /* do not allow reconnection when gameend */
    try {
      if (consented) throw new Error("consented leave");
      const reco_client = await this.allowReconnection(client, 10);
      if (client.sessionId === this.Rid) this.Rgo = true;
      if (client.sessionId === this.Lid) this.Lgo = true;
      reco_client.send("gameInfo", this.inf);
    } catch (e) {
      /* 20 seconds expired. finish the game */
      this.cleanup();
    }
  }

  async onDispose() {
    console.log("GameRoom disposed !");
    /* cleanup room entry */
    rooms.delete(this.roomId);
    /* free users from link */
    users.delete(this.inf.LeftPlayer.id);
    users.delete(this.inf.RightPlayer.id);

    let winner;
    let loser;
    if (!this.Rgo) {
      winner = this.inf.LeftPlayer;
      loser = this.inf.RightPlayer;
    } else if (!this.Lgo) {
      winner = this.inf.RightPlayer;
      loser = this.inf.LeftPlayer;
    } else {
      winner =
        this.state.leftPlayer.score > this.state.rightPlayer.score
          ? this.inf.LeftPlayer
          : this.inf.RightPlayer;
      loser =
        winner === this.inf.LeftPlayer
          ? this.inf.RightPlayer
          : this.inf.LeftPlayer;
    }
    return post("http://localhost:3000/api/game/create-game", {
      headers: {
        authorization: "bearer " + jwt.sign({}, "tr_secret_key"),
      },
      body: {
        category: this.gameMode,
        winner: winner.id,
        loser: loser.id,
        score_winner:
          winner === this.inf.LeftPlayer
            ? this.state.leftPlayer.score
            : this.state.rightPlayer.score,
        score_loser:
          loser === this.inf.LeftPlayer
            ? this.state.leftPlayer.score
            : this.state.rightPlayer.score,
      },
    });
  }
}
