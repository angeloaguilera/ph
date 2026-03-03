"use client";

import React from "react";
import useServicesCatalog from "./forms/InvoiceForm/hooks/useServicesCatalog";

type Props = {
  companyId?: string;
};

export default function ServicesList({ companyId = "" }: Props) {
  // No llamamos a fetchServices aquí (el hook ya hace fetch en su useEffect).
  const { mergeVisibleServices } = useServicesCatalog();

  // Llamada directa: mergeVisibleServices es barata y el hook internamente maneja actualización.
  const visible = mergeVisibleServices(companyId);

  if (!visible || visible.length === 0) {
    return <div className="p-4 text-sm text-gray-600">No hay servicios para mostrar.</div>;
  }

  return (
    <div className="p-4">
      <h3 className="font-medium mb-2">Servicios {companyId ? `(company: ${companyId})` : "(global)"}</h3>
      <ul className="space-y-2">
        {visible.map((s: any) => (
          <li key={s.id} className="border rounded px-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-gray-500">{s.description ?? ""}</div>
              </div>
              <div className="text-xs text-gray-600">{s.companyId ? <span>company</span> : <span>master</span>}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
