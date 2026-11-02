import { useEffect } from "react";

import { patchCachedMachine, revalidateLiveResources, setLiveSinceSource } from "@/services/resourceCache";
import websocketService from "@/services/websocketService";

/**
 * Keeps the saved machine data current while signed in: connects live updates once, applies each
 * machine update to every saved copy (so screens never refetch a list to show one change), and
 * refetches what's on screen after a reconnect, since changes during the gap were missed.
 * Disconnects on sign-out.
 */
export function useLiveMachineUpdates(signedIn: boolean): void {
  useEffect(() => {
    if (!signedIn) return;
    setLiveSinceSource(() => websocketService.getConnectedSince());
    const stopPatching = websocketService.subscribe(patchCachedMachine);
    let connects = 0;
    const stopListening = websocketService.onConnect(() => {
      // The first connect follows sign-in; screens fetched just before it
      if (connects++ > 0) revalidateLiveResources();
    });
    websocketService.connect();

    return () => {
      stopPatching();
      stopListening();
      websocketService.disconnect();
      setLiveSinceSource(() => null);
    };
  }, [signedIn]);
}
