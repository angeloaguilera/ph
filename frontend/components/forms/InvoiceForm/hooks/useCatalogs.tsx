// hooks/useCatalogs.tsx
import useProductsCatalog from "./useProductsCatalog";
import useServicesCatalog from "./useServicesCatalog";
import usePropertyCatalog from "./usePropertyCatalog";
import useAnnexesCatalog from "./useAnnexesCatalog";
import type { PartyRecord } from "../../../../types/invoice";

/**
 * useCatalogs (wrapper)
 * - Combina los hooks separados (productos, servicios, propiedades, anexos)
 * - Expone la API completa para compatibilidad con el hook original
 * - Mantiene ensureCatalogForParty con la misma firma (ahora incluye propertyClones y annexClones)
 *
 * Nota: acepta opcionalmente `party` (retrocompatible si no se pasa).
 */
export default function useCatalogs(party?: PartyRecord) {
  const {
    productsCatalog,
    setProductsCatalog,
    createCatalogProduct,
    updateCatalogProduct,
    removeCatalogProduct,
    cloneCatalogProduct,
    fetchProducts,
  } = useProductsCatalog();

  const {
    servicesCatalog,
    setServicesCatalog,
    createCatalogService,
    updateCatalogService,
    removeCatalogService,
    cloneCatalogService,
    fetchServices,
  } = useServicesCatalog();

  const {
    propertiesCatalog,
    setPropertiesCatalog,
    createCatalogProperty,
    updateCatalogProperty,
    removeCatalogProperty,
    cloneCatalogProperty,
    fetchProperties,
  } = usePropertyCatalog();

  // annexes hook (acepta party opcional)
  const {
    visible: annexesVisible,
    loading: annexesLoading,
    error: annexesError,
    annexes,
    catalog: annexesCatalog,
    fetchAnnexes,
    addFromCatalog: addAnnexFromCatalog,
    createAnexo,
    removeAnexo,
    refresh: refreshAnnexes,
  } = useAnnexesCatalog(party);

  // ensureCatalogForParty: mantengo la firma por compatibilidad.
  // Actualmente no clona automáticamente desde "master", pero devuelvo la estructura esperada.
  const ensureCatalogForParty = (partyRec?: PartyRecord) => {
    return {
      productClones: [] as any[],
      serviceClones: [] as any[],
      propertyClones: [] as any[],
      annexClones: [] as any[],
    };
  };

  return {
    // catálogos y setters
    productsCatalog,
    servicesCatalog,
    propertiesCatalog,
    annexesCatalog,
    setProductsCatalog,
    setServicesCatalog,
    setPropertiesCatalog,

    // ensure helper
    ensureCatalogForParty,

    // products API
    createCatalogProduct,
    updateCatalogProduct,
    removeCatalogProduct,
    cloneCatalogProduct,

    // services API
    createCatalogService,
    updateCatalogService,
    removeCatalogService,
    cloneCatalogService,

    // properties API
    createCatalogProperty,
    updateCatalogProperty,
    removeCatalogProperty,
    cloneCatalogProperty,

    // annexes API (desde useAnnexesCatalog)
    annexesVisible,
    annexesLoading,
    annexesError,
    annexes,
    fetchAnnexes,
    addAnnexFromCatalog,
    createAnexo,
    removeAnexo,
    refreshAnnexes,

    // fetch explícito (opcionales)
    fetchProducts,
    fetchServices,
    fetchProperties,
  };
}