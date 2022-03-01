import Arena from "@colyseus/arena";
import { monitor } from "@colyseus/monitor";
import { Client, LobbyRoom } from "colyseus";

/**
 * Import your Room files
 */
import { GameRoom } from "./rooms/GameRoom";
import { MatchMakingRoom } from "./rooms/MatchMakingRoom";

const players = new Map<string, Client>();

export default Arena({
  getId: () => "Your Colyseus App",

  initializeGameServer: (gameServer) => {
    /**
     * Define your room handlers:
     */
    gameServer.define("lobby", LobbyRoom);
    gameServer
      .define("gameRoom", GameRoom, { players: players })
      .enableRealtimeListing();
    gameServer
      .define("MatchMakingRoom", MatchMakingRoom, { players: players })
      .enableRealtimeListing();
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
