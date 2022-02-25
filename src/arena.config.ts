import Arena from "@colyseus/arena";
import { monitor } from "@colyseus/monitor";
import { LobbyRoom } from "colyseus";

/**
 * Import your Room files
 */
import { GameRoom } from "./rooms/GameRoom";
import { MatchMakingRoom } from "./rooms/MatchMakingRoom";

export default Arena({
  getId: () => "Your Colyseus App",

  initializeGameServer: (gameServer) => {
    /**
     * Define your room handlers:
     */
    gameServer.define("lobby", LobbyRoom);
    gameServer.define("gameRoom", GameRoom).enableRealtimeListing();
    gameServer
      .define("MatchMakingRoom", MatchMakingRoom)
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
