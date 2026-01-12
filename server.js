const http = require("http");
const app = require("./index");
const { setupWebSocket } = require("./websocket/ws");

const server = http.createServer(app);

setupWebSocket(server);

server.listen(3001, () => {
  console.log("Websocket server running on port 3000");
});
