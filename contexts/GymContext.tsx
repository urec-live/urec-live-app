import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { Gym, gymAPI } from "@/services/gymAPI";
import websocketService from "@/services/websocketService";
interface Value {
  gym: Gym | null;
  loading: boolean;
  changeGym: (id: number | null) => Promise<void>;
}
const Context = createContext<Value | null>(null);
export function GymProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const account = user?.username;
  const [state, setState] = useState<{
    account?: string;
    gym: Gym | null;
    loading: boolean;
  }>({ gym: null, loading: true });
  const latest = useRef(account);
  latest.current = account;
  useEffect(() => {
    let cancelled = false;
    websocketService.setGym(null);
    setState({ account, gym: null, loading: !!account });
    if (!account) return;
    const key = `gym:${account}`;
    void (async () => {
      try {
        const gym = await gymAPI.current();
        if (!cancelled) {
          setState({ account, gym, loading: false });
          await AsyncStorage.setItem(key, JSON.stringify(gym));
        }
      } catch {
        const cached = await AsyncStorage.getItem(key).catch(() => null);
        if (!cancelled)
          setState({
            account,
            gym: cached ? JSON.parse(cached) : null,
            loading: false,
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account]);
  const gym = state.account === account ? state.gym : null;
  useEffect(() => {
    websocketService.setGym(gym?.id ?? null);
    return () => websocketService.setGym(null);
  }, [gym?.id]);
  const changeGym = async (id: number | null) => {
    if (!account) throw new Error("Sign in first");
    const selected =
      id === null
        ? (await gymAPI.disconnect(), null)
        : await gymAPI.connect(id);
    if (latest.current !== account) return;
    await AsyncStorage.setItem(`gym:${account}`, JSON.stringify(selected));
    setState({ account, gym: selected, loading: false });
  };
  return (
    <Context.Provider
      value={{
        gym,
        loading: state.account !== account || state.loading,
        changeGym,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useGym() {
  const value = useContext(Context);
  if (!value) throw new Error("GymProvider missing");
  return value;
}
