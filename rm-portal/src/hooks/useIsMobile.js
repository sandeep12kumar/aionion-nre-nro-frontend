import { useEffect, useState } from "react";

// Matches the shell's lg breakpoint (1024px) used elsewhere to switch
// between the desktop sidebar and the mobile step nav.
const QUERY = "(max-width: 1023px)";

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
