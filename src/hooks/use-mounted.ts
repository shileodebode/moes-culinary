import { useEffect, useState } from "react";

/**
 * Returns true after the component has mounted on the client.
 * Use to gate client-only UI (e.g. Radix Select) when SSR + a meddling
 * browser extension causes hydration mismatches around hidden <select> nodes.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
