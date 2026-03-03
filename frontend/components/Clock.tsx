"use client";
import { useEffect, useState } from "react";

export default function Clock() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    setNow(new Date().toLocaleString());
    const id = setInterval(() => setNow(new Date().toLocaleString()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <span aria-hidden>—</span>;
  return <span>{now}</span>;
}
