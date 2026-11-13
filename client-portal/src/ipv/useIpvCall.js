import { useCallback, useEffect, useRef, useState } from "react";
import { ipvApi } from "./ipvApi";

export const STATUS_LABEL = {
  idle: "Not connected",
  joining: "Joining…",
  waiting: "Waiting for the other side to join",
  connecting: "Connecting video…",
  connected: "Connected",
  reconnecting: "Connection lost, reconnecting…",
  replaced: "Opened in another window",
  ended: "Call ended",
  error: "Connection problem",
};

const POLL_MS = 1000;
const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The video call between the RM and the client (WebRTC). The video goes
// directly between the two browsers; the setup messages (offer, answer, ICE
// candidates) go through the backend: each side posts to /ipv/send and polls
// /ipv/poll about once a second (server: services/ipv/ipvService.js).
//
// Only the RM makes offers; the client answers. When either side (re)joins,
// the RM starts a fresh connection, so a refreshed tab on either side
// reconnects by itself.
//
// onEvent(event, data) gets everything that isn't call setup:
//   client: doc:request, doc:clear, doc:captured, session:ended
//   rm:     location, session:ended
export function useIpvCall({ token, role, localStream, active, onEvent }) {
  const [status, setStatus] = useState("idle");
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerOnline, setPeerOnline] = useState(false);
  const [error, setError] = useState("");

  const api = useRef(ipvApi(token));
  const browserId = useRef(randomId());
  const pc = useRef(null);
  const ice = useRef([]);
  const pending = useRef([]);
  const after = useRef(0);
  const offered = useRef(false);
  const stream = useRef(localStream);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  stream.current = localStream;

  const send = useCallback(
    (event, data) => api.current.post("/ipv/send", { browserId: browserId.current, event, data }).catch(() => {}),
    [],
  );

  const newConnection = useCallback(() => {
    pc.current?.close();
    const conn = new RTCPeerConnection({ iceServers: ice.current });
    stream.current?.getTracks().forEach((track) => conn.addTrack(track, stream.current));
    conn.ontrack = (e) => setRemoteStream(e.streams[0] || new MediaStream([e.track]));
    conn.onicecandidate = (e) => { if (e.candidate) send("signal", { candidate: e.candidate.toJSON() }); };
    conn.onconnectionstatechange = () => {
      if (pc.current !== conn) return;
      const state = conn.connectionState;
      if (state === "connected") setStatus("connected");
      else if (state === "disconnected") setStatus("reconnecting");
      else if (state === "failed") {
        setStatus("reconnecting");
        if (role === "rm") makeOffer(true); // eslint-disable-line no-use-before-define
      }
    };
    pending.current = [];
    pc.current = conn;
    return conn;
  }, [role, send]);

  const makeOffer = useCallback(async (iceRestart = false) => {
    const conn = pc.current;
    if (!conn) return;
    try {
      const offer = await conn.createOffer({ iceRestart });
      await conn.setLocalDescription(offer);
      await send("signal", { description: conn.localDescription });
      if (!iceRestart) setStatus("connecting");
    } catch (err) {
      console.warn("[IPV] offer failed", err);
    }
  }, [send]);

  const handleSignal = useCallback(async (data) => {
    const conn = pc.current;
    if (!conn || !data) return;
    try {
      if (data.description?.type === "offer") {
        if (conn.signalingState !== "stable") await conn.setLocalDescription({ type: "rollback" }).catch(() => {});
        await conn.setRemoteDescription(data.description);
        for (const c of pending.current.splice(0)) await conn.addIceCandidate(c).catch(() => {});
        await conn.setLocalDescription(await conn.createAnswer());
        await send("signal", { description: conn.localDescription });
        setStatus((s) => (s === "connected" ? s : "connecting"));
      } else if (data.description?.type === "answer") {
        if (conn.signalingState === "have-local-offer") {
          await conn.setRemoteDescription(data.description);
          for (const c of pending.current.splice(0)) await conn.addIceCandidate(c).catch(() => {});
        }
      } else if (data.candidate) {
        if (conn.remoteDescription) await conn.addIceCandidate(data.candidate).catch(() => {});
        else pending.current.push(data.candidate);
      }
    } catch (err) {
      console.warn("[IPV] signal failed", err);
    }
  }, [send]);

  // The other side has (re)joined: the RM starts a fresh connection and
  // offers; the client gets ready for that offer.
  const peerJoined = useCallback(() => {
    newConnection();
    if (role === "rm") {
      offered.current = true;
      makeOffer();
    } else {
      setStatus("connecting");
    }
  }, [makeOffer, newConnection, role]);

  useEffect(() => {
    if (!active || !localStream) return undefined;
    let stopped = false;
    (async () => {
      setStatus("joining");
      setError("");
      try {
        const { data } = await api.current.post("/ipv/join", { browserId: browserId.current });
        ice.current = data.iceServers || [];
        after.current = 0;
        newConnection();
        setPeerOnline(data.peerPresent);
        if (data.peerPresent && role === "rm") {
          offered.current = true;
          makeOffer();
        } else {
          setStatus(data.peerPresent ? "connecting" : "waiting");
        }
      } catch (err) {
        setStatus("error");
        setError(err.response?.data?.message || "Could not join the call. Please refresh the page.");
        return;
      }

      let failures = 0;
      while (!stopped) {
        try {
          const { data } = await api.current.get("/ipv/poll", { params: { browserId: browserId.current, after: after.current } });
          failures = 0;
          if (data.replaced) {
            setStatus("replaced");
            pc.current?.close();
            return;
          }
          for (const message of data.messages) {
            after.current = Math.max(after.current, Number(message.id) || 0);
            if (message.event === "signal") await handleSignal(message.data);
            else if (message.event === "peer:joined") peerJoined();
            else {
              if (message.event === "session:ended") {
                setStatus("ended");
                pc.current?.close();
              }
              onEventRef.current?.(message.event, message.data);
            }
          }
          setPeerOnline(data.peerOnline);
          // both joined at the same moment, so neither saw the other: the RM
          // offers as soon as the client shows up
          if (role === "rm" && data.peerOnline && !offered.current) peerJoined();
          if (!data.peerOnline) offered.current = false;
          if (data.status === "completed" || data.status === "cancelled") {
            setStatus("ended");
            pc.current?.close();
            onEventRef.current?.("session:ended", { status: data.status });
            return;
          }
        } catch (err) {
          failures += 1;
          if (err.response?.status === 404 || err.response?.status === 410) {
            setStatus("error");
            setError(err.response.data?.message || "This call has ended.");
            return;
          }
          if (failures >= 3) setStatus((s) => (s === "connected" ? s : "reconnecting"));
        }
        await sleep(POLL_MS);
      }
    })();
    return () => {
      stopped = true;
      pc.current?.close();
      pc.current = null;
    };
    // join once per call; the stream is swapped below without rejoining
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, Boolean(localStream)]);

  // A new camera (front / back switch): swap the tracks in place.
  useEffect(() => {
    const conn = pc.current;
    if (!conn || !localStream) return;
    for (const track of localStream.getTracks()) {
      const sender = conn.getSenders().find((s) => s.track?.kind === track.kind);
      if (sender) sender.replaceTrack(track).catch(() => {});
    }
  }, [localStream]);

  return { status, remoteStream, peerOnline, error, send };
}
