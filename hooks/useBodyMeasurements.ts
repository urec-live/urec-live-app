import { useCachedResource } from "@/hooks/useCachedResource";
import { measurementsCacheKey, readMeasurements } from "@/services/bodyMeasurements";

export function useBodyMeasurements(username?: string) {
  return useCachedResource(
    username ? measurementsCacheKey(username) : null,
    () => readMeasurements(username!),
    { staleTime: Infinity },
  );
}
