"use client";

import React, { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import Peer, { SignalData } from "simple-peer";

// The signaling server is now part of our app, so we always use the current origin
const SIGNALING_SERVER_URL: string =
  typeof window !== "undefined" ? window.location.origin : "";
const ROOM_ID = "general-video-chat"; // Use a fixed room ID for simplicity

interface PeerData {
  peerId: string;
  peer: Peer.Instance;
  stream?: MediaStream;
}

export default function VideoChat() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerData[]>([]);
  const myVideoRef = useRef<HTMLVideoElement>(null);
  // Store peer connections keyed by peerId
  const peerConnectionsRef = useRef<Record<string, Peer.Instance>>({});
  // Store refs for peer videos
  const peerVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  // Debug: keep track of connected peers
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  // Function to create a new peer connection
  const createPeer = (
    peerId: string,
    isInitiator: boolean,
    stream: MediaStream
  ) => {
    console.log(
      `Creating peer connection with ${peerId}, initiator: ${isInitiator}`
    );

    // Check if peer already exists
    if (peerConnectionsRef.current[peerId]) {
      console.log(`Peer ${peerId} already exists, destroying old connection`);
      peerConnectionsRef.current[peerId].destroy();
      setPeers((prevPeers) => prevPeers.filter((p) => p.peerId !== peerId));
    }

    const peer = new Peer({
      initiator: isInitiator,
      trickle: true,
      stream: stream,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
      },
    });

    peer.on("signal", (signal) => {
      console.log(`Sending signal to ${peerId}`, signal);
      socket?.emit("signal", {
        to: peerId,
        signal,
      });
    });

    peer.on("connect", () => {
      console.log(`Peer connection established with ${peerId}`);
      // Update connected peers list for debugging
      setConnectedPeers((prev) => [
        ...prev.filter((id) => id !== peerId),
        peerId,
      ]);
    });

    peer.on("stream", (remoteStream) => {
      console.log(`Received stream from ${peerId}`, remoteStream);

      // Update the peers state with the new stream
      setPeers((prevPeers) => {
        const updatedPeers = prevPeers.map((p) =>
          p.peerId === peerId ? { ...p, stream: remoteStream } : p
        );
        console.log("Updated peers with stream:", updatedPeers);
        return updatedPeers;
      });

      // Immediately try to set the stream to the video element if it exists
      const videoElement = peerVideoRefs.current[peerId];
      if (videoElement && videoElement.srcObject !== remoteStream) {
        console.log(`Setting stream to video element for ${peerId}`);
        videoElement.srcObject = remoteStream;
      }
    });

    peer.on("error", (err) => {
      console.error(`Peer error with ${peerId}:`, err);
    });

    peer.on("close", () => {
      console.log(`Peer connection with ${peerId} closed`);
      setConnectedPeers((prev) => prev.filter((id) => id !== peerId));
    });

    // Store the peer connection
    peerConnectionsRef.current[peerId] = peer;

    return peer;
  };

  // Function to add a new peer to the peers state
  const addPeer = (peerId: string, peer: Peer.Instance) => {
    console.log(`Adding peer ${peerId} to state`);
    setPeers((prevPeers) => {
      const newPeers = [
        ...prevPeers.filter((p) => p.peerId !== peerId),
        { peerId, peer },
      ];
      console.log("Updated peers state:", newPeers);
      return newPeers;
    });
    // Initialize the ref for this peer's video
    peerVideoRefs.current[peerId] = null;
  };

  // Handle incoming signals
  const handleSignal = (data: { from: string; signal: unknown }) => {
    console.log(`Handling signal from ${data.from}`, data.signal);
    const { from, signal } = data;
    const peer = peerConnectionsRef.current[from];

    if (peer) {
      peer.signal(signal as SignalData);
    } else {
      console.error(`No peer found for ${from}`);

      // If we have a stream but no peer, create one
      if (myStream) {
        console.log(`Creating new peer for ${from} after receiving signal`);
        const newPeer = createPeer(from, false, myStream);
        addPeer(from, newPeer);
        // Signal the peer with the data we just received
        newPeer.signal(signal as SignalData);
      }
    }
  };

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
          console.log("Got user media stream", stream);
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

      // We need myStream to create peers
      if (!myStream) {
        console.error(
          "No local stream available for connecting to existing peers"
        );
        return;
      }

      // Create connections to all existing peers
      peerIds.forEach((peerId) => {
        console.log(`Creating connection to existing peer ${peerId}`);
        const peer = createPeer(peerId, true, myStream);
        addPeer(peerId, peer);
      });
    });

    newSocket.on("peer-connected", (peerId: string) => {
      console.log("Peer connected:", peerId);

      // We need myStream to create peers
      if (!myStream) {
        console.error("No local stream available for connecting to new peer");
        return;
      }

      // Create connection to the new peer (we are not the initiator)
      const peer = createPeer(peerId, false, myStream);
      addPeer(peerId, peer);
    });

    newSocket.on("signal", (data: { from: string; signal: unknown }) => {
      console.log("Received signal from:", data.from, data.signal);
      handleSignal(data);
    });

    newSocket.on("peer-disconnected", (peerId: string) => {
      console.log("Peer disconnected:", peerId);

      // Cleanup the peer connection
      const peer = peerConnectionsRef.current[peerId];
      if (peer) {
        peer.destroy();
        delete peerConnectionsRef.current[peerId];
        delete peerVideoRefs.current[peerId];
      }

      // Remove peer from state
      setPeers((prevPeers) => {
        const newPeers = prevPeers.filter((p) => p.peerId !== peerId);
        console.log("Peers after disconnect:", newPeers);
        return newPeers;
      });

      // Update connected peers list
      setConnectedPeers((prev) => prev.filter((id) => id !== peerId));
    });

    // Cleanup on component unmount
    return () => {
      console.log("Disconnecting socket and cleaning up...");
      myStream?.getTracks().forEach((track) => track.stop());
      Object.values(peerConnectionsRef.current).forEach((peer) =>
        peer.destroy()
      );
      newSocket.disconnect();
      setConnectedPeers([]);
    };
  }, []); // Run only once on mount

  // Set up ref callback for peer videos
  const setPeerVideoRef =
    (peerId: string) => (element: HTMLVideoElement | null) => {
      console.log(`Setting video ref for peer ${peerId}`, element);
      peerVideoRefs.current[peerId] = element;

      // If we have the element and stream, set it
      const peerData = peers.find((p) => p.peerId === peerId);
      if (element && peerData?.stream) {
        console.log(
          `Found stream for peer ${peerId}, setting to video element`
        );
        element.srcObject = peerData.stream;

        // Make sure video plays
        element
          .play()
          .catch((e) => console.error(`Error playing video for ${peerId}:`, e));
      } else {
        console.log(`No stream yet for peer ${peerId}`);
      }
    };

  // Update video elements when peer streams change
  useEffect(() => {
    console.log("Peers state updated:", peers);
    peers.forEach((peer) => {
      const videoElement = peerVideoRefs.current[peer.peerId];
      if (
        videoElement &&
        peer.stream &&
        videoElement.srcObject !== peer.stream
      ) {
        console.log(
          `Updating video element for peer ${peer.peerId} with stream`
        );
        videoElement.srcObject = peer.stream;

        // Make sure video plays
        videoElement
          .play()
          .catch((e) =>
            console.error(`Error playing video for ${peer.peerId}:`, e)
          );
      }
    });
  }, [peers]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Video Chat Room: {ROOM_ID}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Remote Peer Video - Only show the first peer in Omegle style */}
        {peers.length > 0 && (
          <div className="border p-2 rounded shadow">
            <h3 className="text-sm font-medium mb-1">
              Peer ({peers[0].peerId.substring(0, 5)}...)
              {peers[0].stream
                ? " (Stream connected)"
                : " (Waiting for stream...)"}
            </h3>
            <video
              ref={setPeerVideoRef(peers[0].peerId)}
              autoPlay
              playsInline
              className="w-full h-auto bg-black rounded"
            />
          </div>
        )}

        {/* Show a message if no peers are connected */}
        {peers.length === 0 && (
          <div className="border p-2 rounded shadow flex items-center justify-center bg-gray-50">
            <p className="text-gray-500">Waiting for someone to join...</p>
          </div>
        )}
      </div>

      {/* Debug info */}
      <div className="mt-4 text-xs text-gray-500">
        <p>
          Connected peers:{" "}
          {connectedPeers.length > 0 ? connectedPeers.join(", ") : "None"}
        </p>
        <p>Peers with streams: {peers.filter((p) => p.stream).length}</p>
      </div>

      {/* Room status */}
      <div className="mt-2 text-sm text-gray-600">
        <p>
          {peers.length === 0
            ? "You're alone in this room."
            : `Connected with ${peers.length} peer${
                peers.length > 1 ? "s" : ""
              }.`}
        </p>
      </div>
    </div>
  );
}
