// Import required packages
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

// Determine development or production mode
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Prepare the app
app.prepare().then(() => {
    // Create HTTP server
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    // Initialize Socket.IO server
    const io = new Server(server, {
        cors: {
            origin: "*", // In production, you might want to restrict this
            methods: ["GET", "POST"],
        },
    });

    // Store room information
    const rooms = {};

    // Socket.IO connection handling
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on("join-room", (roomId) => {
            console.log(`User ${socket.id} attempting to join room ${roomId}`);
            socket.join(roomId);
            if (!rooms[roomId]) {
                rooms[roomId] = [];
            }
            rooms[roomId].push(socket.id);
            console.log(`User ${socket.id} joined room ${roomId}`);

            // Notify others in the room about the new peer
            socket.to(roomId).emit("peer-connected", socket.id);
            console.log(`Emitted 'peer-connected' to room ${roomId} for peer ${socket.id}`);

            // Send existing peers in the room to the new peer
            const otherPeers = rooms[roomId].filter(peerId => peerId !== socket.id);
            socket.emit("existing-peers", otherPeers);
            console.log(`Sent existing peers ${otherPeers} to ${socket.id}`);
        });

        // Relay signaling messages
        socket.on("signal", (payload) => {
            console.log(`Relaying signal from ${socket.id} to ${payload.to}`);
            io.to(payload.to).emit("signal", {
                from: socket.id,
                signal: payload.signal,
            });
        });

        socket.on("disconnecting", () => {
            console.log(`User disconnecting: ${socket.id}`);
            // Find rooms the user was in and notify others
            for (const roomId of socket.rooms) {
                if (roomId !== socket.id) { // socket.io creates a room for each socket id
                    console.log(`User ${socket.id} leaving room ${roomId}`);
                    socket.to(roomId).emit("peer-disconnected", socket.id);
                    if (rooms[roomId]) {
                        rooms[roomId] = rooms[roomId].filter(peerId => peerId !== socket.id);
                        if (rooms[roomId].length === 0) {
                            delete rooms[roomId];
                        }
                    }
                    console.log(`Notified room ${roomId} about ${socket.id} disconnecting.`);
                }
            }
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
        });

        socket.on("connect_error", (err) => {
            console.error(`Connection error for socket ${socket.id}:`, err.message);
        });
    });

    // Start the server
    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> Socket.IO server integrated on the same port`);
    });
}); 