// hooks/useCatalogs.tsx
import useProductsCatalog from "./useProductsCatalog";
import useServicesCatalog from "./useServicesCatalog";
import type { PartyRecord } from "../../../../types/invoice";

/**
 * useCatalogs (wrapper)
 * - Combina los hooks separados y expone la API completa (compatibilidad con el hook original)
 * - Se eliminó todo lo relacionado con "master" (masterProducts/masterServices)
 */
export default function useCatalogs() {
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

  // ensureCatalogForParty: ya no usa "master" ni clona elementos desde listas maestras.
  // Se mantiene la firma por compatibilidad y devuelve arrays vacíos.
  const ensureCatalogForParty = (partyRec?: PartyRecord) => {
    return { productClones: [] as any[], serviceClones: [] as any[] };
  };

  return {
    productsCatalog,
    servicesCatalog,
    setProductsCatalog,
    setServicesCatalog,
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
    // opcional: fetch explícito
    fetchProducts,
    fetchServices,
  };
}
