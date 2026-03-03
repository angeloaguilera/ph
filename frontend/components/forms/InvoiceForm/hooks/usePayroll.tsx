// hooks/usePayroll.tsx
import { useEffect, useState } from "react";
import type { Employee, PayrollReceipt } from "../../../../types/invoice";
import { genId } from "../../../../lib/invoiceUtils";
import { EMPLOYEES_LOCAL_KEY } from "./constants";

/**
 * usePayroll
 * - employees list persisted
 * - payrollReceipts list
 */
export default function usePayroll(initialEmployees?: Employee[]) {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const raw = localStorage.getItem(EMPLOYEES_LOCAL_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return initialEmployees ?? [];
  });

  const [showNewEmployeeForm, setShowNewEmployeeForm] = useState(false);
  const [newEmployeeDraft, setNewEmployeeDraft] = useState<Partial<Employee> & { birthDate?: string }>({
    firstName: "",
    lastName: "",
    document: "",
    nit: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    country: "",
    bank: "",
    bankAccount: "",
    birthDate: "",
    photoDataUrl: undefined,
  });
  const [employeePhotoPreview, setEmployeePhotoPreview] = useState<string | undefined>(undefined);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | undefined>(undefined);
  const [receiptEmployeeFormIndex, setReceiptEmployeeFormIndex] = useState<number | null>(null);

  const [payrollReceipts, setPayrollReceipts] = useState<PayrollReceipt[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(EMPLOYEES_LOCAL_KEY, JSON.stringify(employees));
    } catch (e) {}
  }, [employees]);

  const addPayrollReceipt = () => {
    setPayrollReceipts((p) => [
      ...p,
      {
        id: genId(),
        name: "Recibo nómina",
        number: "",
        destination: "BANCO",
        bank: "",
        caja: "",
        paymentType: "",
        reference: "",
        amount: 0,
      } as PayrollReceipt,
    ]);
  };

  const updatePayrollReceipt = (idx: number, patch: Partial<PayrollReceipt>) =>
    setPayrollReceipts((p) => {
      if (!p[idx]) return p;
      const c = [...p];
      c[idx] = { ...c[idx], ...patch };
      return c;
    });

  const removePayrollReceipt = (idx: number) => setPayrollReceipts((p) => p.filter((_, i) => i !== idx));

  const handleRegisterAndUseEmployee = (editingEmployeeIdArg?: string) => {
    if (!newEmployeeDraft.firstName || !newEmployeeDraft.firstName.trim()) return alert("Nombre es requerido para registrar empleado.");
    if (!newEmployeeDraft.lastName || !newEmployeeDraft.lastName.trim()) return alert("Apellido es requerido para registrar empleado.");
    if (!newEmployeeDraft.document || !newEmployeeDraft.document.trim()) return alert("RIF / Cédula es requerido para registrar empleado.");

    if (editingEmployeeIdArg || editingEmployeeId) {
      const eid = editingEmployeeIdArg ?? editingEmployeeId!;
      setEmployees((p) => p.map((rec) => (rec.id === eid ? { ...(rec as Employee), ...newEmployeeDraft, id: eid } as Employee : rec)));
      if (receiptEmployeeFormIndex !== null) {
        setPayrollReceipts((p) => {
          const copy = [...p];
          copy[receiptEmployeeFormIndex] = { ...copy[receiptEmployeeFormIndex], employeeId: eid };
          return copy;
        });
      }
    } else {
      const newRec: Employee = {
        id: genId(),
        firstName: (newEmployeeDraft.firstName ?? "").trim(),
        lastName: (newEmployeeDraft.lastName ?? "").trim(),
        document: ((newEmployeeDraft as any).document ?? "").trim(),
        nit: newEmployeeDraft.nit ?? "",
        phone: newEmployeeDraft.phone,
        email: newEmployeeDraft.email,
        address: newEmployeeDraft.address,
        city: newEmployeeDraft.city,
        country: newEmployeeDraft.country,
        bank: newEmployeeDraft.bank,
        bankAccount: newEmployeeDraft.bankAccount,
        birthDate: newEmployeeDraft.birthDate,
        photoDataUrl: newEmployeeDraft.photoDataUrl,
      };
      setEmployees((p) => [newRec, ...p]);

      if (receiptEmployeeFormIndex !== null) {
        setPayrollReceipts((p) => {
          const copy = [...p];
          copy[receiptEmployeeFormIndex] = { ...copy[receiptEmployeeFormIndex], employeeId: newRec.id };
          return copy;
        });
      }
    }

    setShowNewEmployeeForm(false);
    setEditingEmployeeId(undefined);
    setReceiptEmployeeFormIndex(null);
    setNewEmployeeDraft({ firstName: "", lastName: "", document: "", nit: "", phone: "", email: "", address: "", city: "", country: "", bank: "", bankAccount: "", birthDate: "", photoDataUrl: undefined });
    setEmployeePhotoPreview(undefined);
  };

  const handleUseEmployeeWithoutRegister = () => {
    if (!newEmployeeDraft.firstName || !newEmployeeDraft.firstName.trim()) return alert("Nombre es requerido para usar empleado.");
    if (!newEmployeeDraft.lastName || !newEmployeeDraft.lastName.trim()) return alert("Apellido es requerido para usar empleado.");
    if (!newEmployeeDraft.document || !newEmployeeDraft.document.trim()) return alert("RIF / Cédula es requerido para usar empleado.");
    setPayrollReceipts((p) => {
      const copy = [...p];
      if (receiptEmployeeFormIndex !== null) {
        copy[receiptEmployeeFormIndex] = {
          ...copy[receiptEmployeeFormIndex],
          employeeSnapshot: {
            firstName: newEmployeeDraft.firstName,
            lastName: newEmployeeDraft.lastName,
            document: newEmployeeDraft.document,
            nit: newEmployeeDraft.nit,
            phone: newEmployeeDraft.phone,
            email: newEmployeeDraft.email,
            bank: newEmployeeDraft.bank,
            bankAccount: newEmployeeDraft.bankAccount,
          } as any,
        };
      }
      return copy;
    });
    setShowNewEmployeeForm(false);
    setReceiptEmployeeFormIndex(null);
  };

  const handleNewEmployeePhotoChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const fr = new FileReader();
    fr.onload = () => {
      const dataUrl = typeof fr.result === "string" ? fr.result : undefined;
      setNewEmployeeDraft((d) => ({ ...d, photoDataUrl: dataUrl }));
      setEmployeePhotoPreview(dataUrl);
    };
    fr.readAsDataURL(file);
  };

  const handleRemoveEmployeeFromTray = (employeeId: string) => {
    if (!employeeId) return;
    if (!confirm("¿Eliminar empleado? Esto removerá la referencia en recibos que lo usen.")) return;
    setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
    setPayrollReceipts((prev) => prev.map((r) => (r.employeeId === employeeId ? { ...r, employeeId: undefined } : r)));
    setEditingEmployeeId((cur) => (cur === employeeId ? undefined : cur));
    setShowNewEmployeeForm(false);
  };

  const handleEditEmployeeFromTray = (employeeId: string) => {
    const found = employees.find((e) => e.id === employeeId);
    if (!found) return alert("Empleado no encontrado.");
    setEditingEmployeeId(found.id);
    setNewEmployeeDraft({
      firstName: found.firstName,
      lastName: found.lastName,
      document: found.document,
      nit: found.nit,
      phone: found.phone,
      email: found.email,
      address: found.address,
      city: found.city,
      country: found.country,
      bank: found.bank,
      bankAccount: found.bankAccount,
      birthDate: found.birthDate,
      photoDataUrl: found.photoDataUrl,
    });
    setEmployeePhotoPreview(found.photoDataUrl);
    setShowNewEmployeeForm(true);
  };

  const handleCloneEmployeeFromTray = (employeeId: string) => {
    const found = employees.find((e) => e.id === employeeId);
    if (!found) return alert("Empleado no encontrado.");
    const clone: Employee = { ...found, id: genId(), firstName: found.firstName + " (copia)" };
    setEmployees((prev) => [clone, ...prev]);
  };

  return {
    employees,
    setEmployees,
    showNewEmployeeForm,
    setShowNewEmployeeForm,
    newEmployeeDraft,
    setNewEmployeeDraft,
    employeePhotoPreview,
    setEmployeePhotoPreview,
    editingEmployeeId,
    setEditingEmployeeId,
    receiptEmployeeFormIndex,
    setReceiptEmployeeFormIndex,
    payrollReceipts,
    addPayrollReceipt,
    updatePayrollReceipt,
    removePayrollReceipt,
    handleRegisterAndUseEmployee,
    handleUseEmployeeWithoutRegister,
    handleNewEmployeePhotoChange,
    handleRemoveEmployeeFromTray,
    handleEditEmployeeFromTray,
    handleCloneEmployeeFromTray,
  };
}
