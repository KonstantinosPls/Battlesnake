import express from "express";

/**
 * Starts the Express HTTP server that exposes the Battlesnake API endpoints
 * (GET / for info, POST /start, /move, and /end) and routes them to the
 * provided handler functions. Listens on the PORT env var or 8000 by default.
 *
 * @param {{info: Function, start: Function, move: Function, end: Function}} handlers - The Battlesnake lifecycle handler functions.
 * @returns {void}
 */
export default function runServer(handlers) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/", (req, res) => {
    res.send(handlers.info());
  });

  app.post("/start", (req, res) => {
    handlers.start(req.body);
    res.send("ok");
  });

  app.post("/move", (req, res) => {
    res.send(handlers.move(req.body));
  });

  app.post("/end", (req, res) => {
    handlers.end(req.body);
    res.send("ok");
  });

  app.use(function (req, res, next) {
    res.set("Server", "battlesnake/github/starter-snake-javascript");
    next();
  });

  const host = "0.0.0.0";
  const port = process.env.PORT || 8000;

  app.listen(port, host, () => {
    console.log(`Running Battlesnake at http://${host}:${port}...`);
  });
}
