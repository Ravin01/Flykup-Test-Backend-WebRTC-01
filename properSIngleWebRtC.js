// import Express from "express";
// import { WebSocketServer } from "ws";

// const app = Express();
// const port = process.env.PORT || 7080;


// app.get('/', (req,res)=>{
//   res.send({msg : 'Working'})
// })


// // Create a WebSocket Server
// const wss = new WebSocketServer({ noServer: true });

// // Store connected clients and their usernames
// const clients = new Map();

// wss.on("connection", (socket) => {
//   let username;

//   socket.on("message", (message) => {
//     const parsedMessage = JSON.parse(message);
//     // console.log('message', parsedMessage)

//     // Handle user registration
//     if (parsedMessage.type === "register") {
//       username = parsedMessage.username;
//       clients.set(socket, username);

//       // Notify all users about the new connection
//       const joinMessage = {
//         type: "system",
//         message: `${username} has joined the chat.`,
//       };
//       broadcast(JSON.stringify(joinMessage));
//     } 
//     // Handle chat messages
//     else if (parsedMessage.type === "chat") {
//       const chatMessage = {
//         type: "chat",
//         user: username,
//         message: parsedMessage.message,
//       };

//       console.log('chatMessage', chatMessage)

//       broadcast(JSON.stringify(chatMessage));
//     } 
//     // Handle WebRTC signaling (offer, answer, ice-candidate)
//     else if (["offer", "answer", "ice-candidate"].includes(parsedMessage.type)) {
//         const stringMessage = JSON.stringify(parsedMessage);
//         console.log('stringMessage', stringMessage)
//         wss.clients.forEach((client) => {
//           if (client !== socket && client.readyState === client.OPEN) {
//             client.send(stringMessage);
//           }
//         });
//     }
//   });

//   socket.on("close", () => {
//     clients.delete(socket);
//     if (username) {
//       const leaveMessage = {
//         type: "system",
//         message: `${username} has left the chat.`,
//       };
//       broadcast(JSON.stringify(leaveMessage));
//     }
//   });
// });

// // Broadcast a message to all connected clients
// function broadcast(data) {
//   clients.forEach((username, clientSocket) => {
//     if (clientSocket.readyState === clientSocket.OPEN) {
//       clientSocket.send(data);
//     }
//   });
// }

// const server = app.listen(port, () =>
//   console.log(`Server is running on port ${port}`)
// );

// // Upgrade the HTTP server to handle WebSocket connections
// server.on("upgrade", (request, socket, head) => {
//   wss.handleUpgrade(request, socket, head, (ws) => {
//     wss.emit("connection", ws, request);
//   });
// });


