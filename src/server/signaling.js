const { Server } = require("socket.io");

// Typically, you'd use environment variables for port and CORS origins
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

console.log(`Attempting to start signaling server on port ${PORT}`);
console.log(`Allowing connections from origin: ${FRONTEND_URL}`);

const io = new Server(PORT, {
    cors: {
        origin: FRONTEND_URL,
        methods: ["GET", "POST"],
    },
});

const rooms = {}; // Store room information (peers, offers, answers, etc.)

console.log("Socket.IO server created.");

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join-room", (roomId) => {
        console.log(`User ${socket.id} attempting to join room ${roomId}`);
        // Simple room joining logic for now
        socket.join(roomId);
        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }
        rooms[roomId].push(socket.id);
        console.log(`User ${socket.id} joined room ${roomId}`);

        // Notify others in the room (excluding sender) about the new peer
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

console.log("Signaling server event listeners attached."); 