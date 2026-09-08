require('dotenv').config();

const http = require('http');
const app = require('./app');
const { setupSocket } = require('./socket');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

setupSocket(server);

server.listen(PORT, () => {
  console.log(`BookNest API running on http://localhost:${PORT}`);
});
