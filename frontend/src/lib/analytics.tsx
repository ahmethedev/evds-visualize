import { useEffect } from "react";
import { useLocation } from "react-router";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = "G-TDFJ26BY9X";

export function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== "function") return;
    const path = location.pathname + location.search;
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.origin + path,
      page_title: document.title,
      send_to: MEASUREMENT_ID,
    });
  }, [location.pathname, location.search]);

  return null;
}
