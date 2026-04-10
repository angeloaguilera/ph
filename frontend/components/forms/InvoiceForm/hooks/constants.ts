// hooks/constants.ts

/* ===============================
   LOCAL STORAGE KEYS
================================= */

export const LOCAL_STORAGE_KEY = "invoice_form_parties_v1";

export const LOCAL_INV_KEY = "admin_inventory_v1";

export const LOCAL_SERV_KEY = "admin_services_v1";

export const EMPLOYEES_LOCAL_KEY = "admin_employees_v1";

export const AUXILIARIES_LOCAL_KEY = "admin_auxiliaries_v1";


/* ===============================
   ADMINISTRATION APIs
================================= */

export const INVENTORY_API = "/api/administration/inventory";

export const INVENTORY_PROPERTY_API = "/api/administration/inventory-property";

export const SERVICES_API = "/api/administration/services";

export const AUX_API = "/api/administration/auxiliary";


/* ===============================
   HR APIs
================================= */

export const EMPLOYEES_API = "/api/hr/employees";


/* ===============================
   INTERNAL MANAGEMENT
================================= */

export const INTERNAL_MANAGEMENT_API =
  "/api/administration/internal-management";


/* ===============================
   CONDOMINIUM MANAGEMENT APIs
   (separadas por dominio)
================================= */

export const CONDO_PROPERTY_API =
  "/api/administration/condominium-management/property";

export const CONDO_ARTICLE_API =
  "/api/administration/condominium-management/article";

export const CONDO_SERVICE_API =
  "/api/administration/condominium-management/service";

export const CONDO_AUXILIARY_API =
  "/api/administration/condominium-management/auxiliary";

/* -------------------------------
   Annexes (Anexos) API endpoints
   ------------------------------- */

/**
 * Base endpoint for annexes (list/create/delete/attach)
 * - GET  /api/.../annexes                -> listar anexos
 * - GET  /api/.../annexes?catalog=true   -> listar anexos + catálogo
 * - POST /api/.../annexes                -> crear anexo (body JSON: name, url | fileDataUrl, ...)
 * - POST /api/.../annexes?action=attach&catalogId=... -> adjuntar desde catálogo
 * - DELETE /api/.../annexes?id=...       -> eliminar anexo por id
 */
export const CONDO_ANNEXES_API =
  "/api/administration/condominium-management/annexes";

/** helper: attach from catalog (use catalogId as query param) */
export const CONDO_ANNEXES_ATTACH_API = `${CONDO_ANNEXES_API}?action=attach`;

/** helper: request catalog together with annexes */
export const CONDO_ANNEXES_WITH_CATALOG_API = `${CONDO_ANNEXES_API}?catalog=true`;

/** helper: delete uses same base path with ?id=... */
export const CONDO_ANNEXES_DELETE_API = CONDO_ANNEXES_API;