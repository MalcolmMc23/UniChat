"use client";

import React, { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
// We will need a library like simple-peer to handle WebRTC complexity
// import Peer from 'simple-peer';

// The signaling server is now part of our app, so we always use the current origin
const SIGNALING_SERVER_URL: string =
  typeof window !== "undefined" ? window.location.origin : "";
const ROOM_ID = "general-video-chat"; // Use a fixed room ID for simplicity

interface PeerData {
  peerId: string;
  // peer: Peer.Instance;
  stream?: MediaStream;
}

export default function VideoChat() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerData[]>([]);
  const myVideoRef = useRef<HTMLVideoElement>(null);
  // Store peer connections keyed by peerId
  // const peerConnectionsRef = useRef<Record<string, Peer.Instance>>({});

  useEffect(() => {
    // Connect to signaling server
    const newSocket = io(SIGNALING_SERVER_URL);
    setSocket(newSocket);
    console.log("Attempting to connect to signaling server...");

    newSocket.on("connect", () => {
      console.log("Connected to signaling server with ID:", newSocket.id);
      // Request user media
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          console.log("Got user media stream");
          setMyStream(stream);
          if (myVideoRef.current) {
            myVideoRef.current.srcObject = stream;
          }
          // Join the predefined room
          newSocket.emit("join-room", ROOM_ID);
          console.log(`Emitted 'join-room' for room: ${ROOM_ID}`);
        })
        .catch((err) => {
          console.error("Failed to get user media:", err);
          // Handle error (e.g., show message to user)
        });
    });

    newSocket.on("connect_error", (err) => {
      console.error("Signaling server connection error:", err);
    });

    // --- Signaling Event Handlers ---

    newSocket.on("existing-peers", (peerIds: string[]) => {
      console.log("Received existing peers:", peerIds);
      // TODO: Establish connections to existing peers
    });

    newSocket.on("peer-connected", (peerId: string) => {
      console.log("Peer connected:", peerId);
      // TODO: Establish connection to the new peer
    });

    newSocket.on("signal", (data: { from: string; signal: unknown }) => {
      console.log("Received signal from:", data.from);
      // TODO: Handle incoming signal (offer/answer/candidate) from a peer
    });

    newSocket.on("peer-disconnected", (peerId: string) => {
      console.log("Peer disconnected:", peerId);
      // TODO: Clean up connection and remove peer's video
      setPeers((prevPeers) => prevPeers.filter((p) => p.peerId !== peerId));
      // delete peerConnectionsRef.current[peerId];
    });

    // Cleanup on component unmount
    return () => {
      console.log("Disconnecting socket and cleaning up...");
      myStream?.getTracks().forEach((track) => track.stop());
      // Object.values(peerConnectionsRef.current).forEach(peer => peer.destroy());
      newSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // TODO: Implement functions to create/handle peer connections
  // e.g., createPeer(peerId, isInitiator), addPeer(peerId, stream), handleSignal(data)

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Video Chat Room: {ROOM_ID}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* My Video */}
        <div className="border p-2 rounded shadow bg-gray-100">
          <h3 className="text-sm font-medium mb-1">
            You ({socket?.id?.substring(0, 5)}...)
          </h3>
          <video
            ref={myVideoRef}
            muted
            autoPlay
            playsInline
            className="w-full h-auto bg-black rounded"
          />
        </div>

        {/* Remote Peers' Videos */}
        {peers.map((peerData) => (
          <div key={peerData.peerId} className="border p-2 rounded shadow">
            <h3 className="text-sm font-medium mb-1">
              Peer ({peerData.peerId.substring(0, 5)}...)
            </h3>
            {/* We need a way to dynamically create video elements for peers */}
            {/* <video ref={/* ref for this peer *} autoPlay playsInline className="w-full h-auto bg-black rounded" /> */}
          </div>
        ))}
      </div>
      {/* Placeholder for actual WebRTC connection logic */}
      <p className="mt-4 text-xs text-gray-500">
        WebRTC connection logic using libraries like simple-peer is needed here.
      </p>
    </div>
  );
}
