export function isTruthyFlag(value: any) {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function hasExplicitCondoTrueFlag(record: any): boolean {
  if (!record) return false;

  const direct = [
    record?.isPropietario,
    record?.isProveedorContratista,
    record?.propietario,
    record?.contratista,
    record?.esPropietario,
    record?.esContratista,
    record?.hasPropietario,
    record?.hasContratista,
    record?.meta?.isPropietario,
    record?.meta?.isProveedorContratista,
    record?.meta?.propietario,
    record?.meta?.contratista,
    record?.meta?.esPropietario,
    record?.meta?.esContratista,
    record?.meta?.hasPropietario,
    record?.meta?.hasContratista,
  ];

  return direct.some(isTruthyFlag);
}

export function forceGeneralCatalogRecord(record: any) {
  const meta = {
    ...(record?.meta ?? {}),
    domain: "general",
    isPropietario: false,
    isProveedorContratista: false,
    propietario: false,
    contratista: false,
    esPropietario: false,
    esContratista: false,
    hasPropietario: false,
    hasContratista: false,
  };

  return {
    ...record,
    domain: "general",
    isPropietario: false,
    isProveedorContratista: false,
    propietario: false,
    contratista: false,
    esPropietario: false,
    esContratista: false,
    hasPropietario: false,
    hasContratista: false,
    meta,
  };
}