import { ref, onUnmounted } from "vue";
import { io, Socket } from "socket.io-client";
import { useAnalysisStore } from "@/stores/analysis";

export function useAnalysisSocket() {
  const store = useAnalysisStore();
  const connected = ref(false);
  let socket: Socket | null = null;

  function connect(sessionId: string) {
    // Disconnect any existing socket
    disconnect();

    const url = window.location.origin;
    socket = io(`${url}/analysis`, {
      transports: ["websocket", "polling"],
      forceNew: true,
    });

    socket.on("connect", () => {
      connected.value = true;
      socket!.emit("subscribe", { sessionId });
    });

    socket.on("subscribed", (_data: { sessionId: string }) => {
      console.log(`[WS] Subscribed to session ${sessionId}`);
    });

    socket.on("analysis:start", (payload: any) => {
      store.handleStart(payload);
    });

    socket.on("step:start", (payload: any) => {
      store.handleStepStart(payload);
    });

    socket.on("step:complete", (payload: any) => {
      store.handleStepComplete(payload);
    });

    socket.on("analysis:complete", (payload: any) => {
      store.handleComplete(payload);
    });

    socket.on("analysis:error", (payload: any) => {
      store.handleError(payload);
    });

    socket.on("disconnect", () => {
      connected.value = false;
    });

    socket.on("connect_error", (err: Error) => {
      console.error("[WS] Connection error:", err.message);
      connected.value = false;
    });
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    connected.value = false;
  }

  onUnmounted(() => {
    disconnect();
  });

  return { connect, disconnect, connected };
}
