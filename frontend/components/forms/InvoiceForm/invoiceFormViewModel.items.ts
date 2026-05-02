import { useCallback } from "react";

export function useInvoiceItemSafety(args: {
  items: any[];
  updateItem: any;
  removeItem: any;
  handleItemPhotosChange: any;
  removeItemPhoto: any;
  activePropertyId: string;
  setActivePropertyId: React.Dispatch<React.SetStateAction<string>>;
  setPropertyAnnexes: React.Dispatch<
    React.SetStateAction<Record<string, any[]>>
  >;
}) {
  const {
    items,
    updateItem,
    removeItem,
    handleItemPhotosChange,
    removeItemPhoto,
    activePropertyId,
    setActivePropertyId,
    setPropertyAnnexes,
  } = args;

  const safeUpdateItem = useCallback(
    async (index: number, patch: Partial<any>) => {
      try {
        await (updateItem as any)(index, patch);
        return;
      } catch {}

      const item = items[index];
      if (!item) return;
      const id = String((item as any).id ?? index);

      try {
        await (updateItem as any)(id, patch);
      } catch (e2) {
        console.warn("safeUpdateItem: updateItem falló con index e id", e2);
      }
    },
    [items, updateItem]
  );

  const safeRemoveItem = useCallback(
    async (index: number) => {
      const item = items[index];

      try {
        await (removeItem as any)(index);
        return;
      } catch {}

      if (item) {
        const id = String((item as any).id ?? index);
        try {
          await (removeItem as any)(id);
        } catch (e2) {
          console.warn("safeRemoveItem: removeItem falló con index e id", e2);
        }
      }

      try {
        const meta = (item as any)?.meta ?? {};
        const isProp =
          String((item as any)?.kind ?? "").toUpperCase() === "PROPERTY" ||
          Boolean(meta?.propertyId);

        const propId = String(meta?.propertyId ?? item?.id ?? "");
        if (isProp && propId) {
          if (propId === activePropertyId) setActivePropertyId("");
          setPropertyAnnexes((prev) => {
            const copy = { ...prev };
            delete copy[propId];
            return copy;
          });
        }
      } catch {}
    },
    [
      activePropertyId,
      items,
      removeItem,
      setActivePropertyId,
      setPropertyAnnexes,
    ]
  );

  const safeOnItemPhotosChange = useCallback(
    async (index: number, files: FileList | null) => {
      try {
        await (handleItemPhotosChange as any)(index, files);
        return;
      } catch {}

      const item = items[index];
      if (!item) return;
      const id = String((item as any).id ?? index);

      try {
        await (handleItemPhotosChange as any)(id, files);
      } catch (e2) {
        console.warn("safeOnItemPhotosChange falló", e2);
      }
    },
    [handleItemPhotosChange, items]
  );

  const safeOnRemoveItemPhoto = useCallback(
    (index: number, photoId: string) => {
      try {
        (removeItemPhoto as any)(index, photoId);
        return;
      } catch {}

      const item = items[index];
      if (!item) return;
      const id = String((item as any).id ?? index);

      try {
        (removeItemPhoto as any)(id, photoId);
      } catch (e2) {
        console.warn("safeOnRemoveItemPhoto falló", e2);
      }
    },
    [items, removeItemPhoto]
  );

  return {
    safeUpdateItem,
    safeRemoveItem,
    safeOnItemPhotosChange,
    safeOnRemoveItemPhoto,
  };
}