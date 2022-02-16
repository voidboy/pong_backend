import Arena from "@colyseus/arena";
import { monitor } from "@colyseus/monitor";

/**
 * Import your Room files
 */
import { GameRoom } from "./rooms/GameRoom";

export default Arena({
    getId: () => "Your Colyseus App",

    initializeGameServer: (gameServer) => {
        /**
         * Define your room handlers:
         */
        gameServer.define("gameRoom", GameRoom);

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
    }
});
