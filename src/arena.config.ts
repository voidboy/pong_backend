import { Session } from "./rooms/GameInfos";
import { GameRoom } from "./rooms/GameRoom";
import { DuelRoom } from "./rooms/DuelRoom";
import { MatchMakingRoom } from "./rooms/MatchMakingRoom";
import Arena from "@colyseus/arena";
import { ServiceRoom } from "./rooms/ServiceRoom";

const users = new Map<string, Session>();
const rooms = new Map<string, Array<string>>();
const connected = new Set<string>();

export default Arena({
  getId: () => "Infinity_Pong_backend",

  initializeGameServer: (gameServer) => {
    gameServer.define("serviceRoom", ServiceRoom, {
      users: users,
      rooms: rooms,
      connected: connected,
    });
    gameServer
      .define("gameRoom", GameRoom, {
        users: users,
        rooms: rooms,
        connected: connected,
      })
      .enableRealtimeListing();
    gameServer.define("matchmakingRoom", MatchMakingRoom, {
      users: users,
      rooms: rooms,
      connected: connected,
    });
    gameServer.define("duelRoom", DuelRoom, {
      users: users,
      rooms: rooms,
      connected: connected,
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
