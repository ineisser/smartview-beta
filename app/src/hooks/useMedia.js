import { useEffect, useState } from "react";

export const MOVIL = "(max-width: 640px)";
export const TABLET = "(max-width: 1024px)";

export default function useMedia(consulta) {
  const [coincide, setCoincide] = useState(() => (
    typeof window !== "undefined" && window.matchMedia(consulta).matches
  ));

  useEffect(() => {
    const media = window.matchMedia(consulta);
    const sync = () => setCoincide(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [consulta]);

  return coincide;
}
