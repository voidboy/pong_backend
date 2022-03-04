import Arena from "@colyseus/arena";
import { Client, LobbyRoom } from "colyseus";
import { Session } from "./rooms/GameInfos";
import { GameRoom } from "./rooms/GameRoom";
import { MatchMakingRoom } from "./rooms/MatchMakingRoom";

const users = new Map<string, Session>();
const rooms = new Map<string, Array<string>>();

export default Arena({
  getId: () => "Infinity_Pong_backend",

  initializeGameServer: (gameServer) => {
    gameServer.define("lobby", LobbyRoom);
    gameServer
      .define("gameRoom", GameRoom, { users: users, rooms: rooms })
      .enableRealtimeListing();
    gameServer.define("MatchMakingRoom", MatchMakingRoom, {
      users: users,
      rooms: rooms,
    });
  },

  /*
  initializeExpress: (app) => {
    app.get("/", (req, res) => {
      res.send("It's time to kick ass and chew bubblegum!");
    });

    app.use("/colyseus", monitor());
  },
  */

  beforeListen: () => {
    /**
     * Before before gameServer.listen() is called.
     */
  },
});
