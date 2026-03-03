"use client";
import { useEffect, useState } from "react";

export default function RandomClient() {
  const [value, setValue] = useState<number | null>(null);
  useEffect(() => {
    setValue(Math.random());
  }, []);
  return <div>{value === null ? <em>Cargando...</em> : value.toFixed(6)}</div>;
}
