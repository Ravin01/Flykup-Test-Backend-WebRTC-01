// server.js (Backend)
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();

const allowedOrigins = [
  // 'http://localhost:3000',
  // Add your production origins here
];

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
}));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    transports: ['websocket', 'polling']
  },
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

const activeVendors = new Map(); // vendorId -> { socketId, vendorName }
const viewers = new Map(); // vendorId -> Set of { viewerId, viewerName }
const chatRooms = new Map(); // vendorId -> array of messages

io.on('connection', (socket) => {
  // Vendor handlers
  socket.on('vendor-ready', ({ vendorId, vendorName }) => {
    activeVendors.set(vendorId, { socketId: socket.id, vendorName });
    chatRooms.set(vendorId, []);
    
    io.emit('vendor-list', Array.from(activeVendors.entries()).map(([id, data]) => ({
      vendorId: id,
      vendorName: data.vendorName,
      viewerCount: viewers.get(id)?.size || 0
    })));
  });

  socket.on('vendor-stop', ({ vendorId }) => {
    activeVendors.delete(vendorId);
    chatRooms.delete(vendorId);
    
    // Notify viewers that stream has ended
    if (viewers.has(vendorId)) {
      viewers.get(vendorId).forEach(viewer => {
        io.to(viewer.viewerId).emit('stream-ended', { vendorId });
      });
      viewers.delete(vendorId);
    }
    
    io.emit('vendor-list', Array.from(activeVendors.entries()).map(([id, data]) => ({
      vendorId: id,
      vendorName: data.vendorName,
      viewerCount: viewers.get(id)?.size || 0
    })));
  });

  // Viewer handlers
  socket.on('get-vendors', () => {
    socket.emit('vendor-list', Array.from(activeVendors.entries()).map(([id, data]) => ({
      vendorId: id,
      vendorName: data.vendorName,
      viewerCount: viewers.get(id)?.size || 0
    })));
  });

  socket.on('viewer-request', ({ vendorId, viewerName }) => {
    const vendor = activeVendors.get(vendorId);
    if (vendor) {
      // Add viewer to tracking
      if (!viewers.has(vendorId)) {
        viewers.set(vendorId, new Set());
      }
      viewers.get(vendorId).add({ viewerId: socket.id, viewerName });
      
      // Send previous chat messages to new viewer
      const previousMessages = chatRooms.get(vendorId) || [];
      socket.emit('chat-history', previousMessages);
      
      // Forward request to vendor
      io.to(vendor.socketId).emit('viewer-request', {
        viewerId: socket.id,
        viewerName
      });
      
      // Update viewer counts
      io.emit('vendor-list', Array.from(activeVendors.entries()).map(([id, data]) => ({
        vendorId: id,
        vendorName: data.vendorName,
        viewerCount: viewers.get(id)?.size || 0
      })));
    }
  });

  // Chat handlers
  socket.on('chat-message', (message) => {
    const { vendorId } = message;
    if (chatRooms.has(vendorId)) {
      chatRooms.get(vendorId).push(message);
      // Broadcast to all viewers of this vendor and the vendor
      if (viewers.has(vendorId)) {
        viewers.get(vendorId).forEach(viewer => {
          io.to(viewer.viewerId).emit('chat-message', message);
        });
      }
      const vendor = activeVendors.get(vendorId);
      if (vendor) {
        io.to(vendor.socketId).emit('chat-message', message);
      }
    }
  });

  // WebRTC signaling
  socket.on('stream-offer', ({ offer, viewerId, vendorId }) => {
    io.to(viewerId).emit('stream-offer', { offer, vendorId });
  });

  socket.on('stream-answer', ({ answer, vendorId }) => {
    const vendor = activeVendors.get(vendorId);
    if (vendor) {
      io.to(vendor.socketId).emit('stream-answer', {
        answer,
        viewerId: socket.id
      });
    }
  });

  socket.on('ice-candidate', ({ candidate, vendorId, viewerId }) => {
    const targetId = viewerId || activeVendors.get(vendorId)?.socketId;
    if (targetId) {
      io.to(targetId).emit('ice-candidate', {
        candidate,
        viewerId: socket.id
      });
    }
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    // Check if disconnected socket was a vendor
    for (const [vendorId, vendor] of activeVendors.entries()) {
      if (vendor.socketId === socket.id) {
        activeVendors.delete(vendorId);
        chatRooms.delete(vendorId);
        // Notify viewers
        if (viewers.has(vendorId)) {
          viewers.get(vendorId).forEach(viewer => {
            io.to(viewer.viewerId).emit('stream-ended', { vendorId });
          });
          viewers.delete(vendorId);
        }
        io.emit('vendor-list', Array.from(activeVendors.entries()).map(([id, data]) => ({
          vendorId: id,
          vendorName: data.vendorName,
          viewerCount: viewers.get(id)?.size || 0
        })));
        return;
      }
    }
    
    // Check if disconnected socket was a viewer
    for (const [vendorId, viewerSet] of viewers.entries()) {
      const viewer = Array.from(viewerSet).find(v => v.viewerId === socket.id);
      if (viewer) {
        viewerSet.delete(viewer);
        const vendor = activeVendors.get(vendorId);
        if (vendor) {
          io.to(vendor.socketId).emit('viewer-disconnect', {
            viewerId: socket.id,
            viewerName: viewer.viewerName
          });
        }
        // Update viewer counts
        io.emit('vendor-list', Array.from(activeVendors.entries()).map(([id, data]) => ({
          vendorId: id,
          vendorName: data.vendorName,
          viewerCount: viewers.get(id)?.size || 0
        })));
        return;
      }
    }
  });
});


app.get('/', (req,res) =>{
  res.send({msg : 'server is running'})
})

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});