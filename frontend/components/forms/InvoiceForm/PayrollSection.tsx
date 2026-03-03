// components/forms/InvoiceForm/PayrollSection.tsx
"use client";
import React from "react";
import type { Employee, PayrollReceipt } from "../../../types/invoice";

export default function PayrollSection({
  payrollReceipts,
  addPayrollReceipt,
  updatePayrollReceipt,
  removePayrollReceipt,
  employees,
  showNewEmployeeForm,
  setShowNewEmployeeForm,
  newEmployeeDraft,
  setNewEmployeeDraft,
  employeePhotoPreview,
  setEmployeePhotoPreview,         // <-- agregado
  handleNewEmployeePhotoChange,
  handleRegisterAndUseEmployee,
  handleUseEmployeeWithoutRegister,
  handleRemoveEmployeeFromTray,
  handleEditEmployeeFromTray,
  handleCloneEmployeeFromTray,
  calculateAgeFromDate,
  editingEmployeeId,
  setEditingEmployeeId,
  receiptEmployeeFormIndex,
  setReceiptEmployeeFormIndex,
}: {
  payrollReceipts: PayrollReceipt[];
  addPayrollReceipt: () => void;
  updatePayrollReceipt: (idx: number, patch: Partial<PayrollReceipt>) => void;
  removePayrollReceipt: (idx: number) => void;
  employees: Employee[];
  showNewEmployeeForm: boolean;
  setShowNewEmployeeForm: (v: boolean) => void;
  newEmployeeDraft: any;
  setNewEmployeeDraft: (v: any) => void;
  employeePhotoPreview?: string;
  setEmployeePhotoPreview: (v?: string | undefined) => void; // <-- tipo agregado
  handleNewEmployeePhotoChange: (files: FileList | null) => void;
  handleRegisterAndUseEmployee: () => void;
  handleUseEmployeeWithoutRegister: () => void;
  handleRemoveEmployeeFromTray: (id: string) => void;
  handleEditEmployeeFromTray: (id: string) => void;
  handleCloneEmployeeFromTray: (id: string) => void;
  calculateAgeFromDate: (s?: string) => number | undefined;
  editingEmployeeId?: string;
  setEditingEmployeeId: (id?: string) => void;
  receiptEmployeeFormIndex: number | null;
  setReceiptEmployeeFormIndex: (n: number | null) => void;
}) {
  const hasPayrollReceipts = payrollReceipts.length > 0;

  return (
    <div className="border rounded p-3">
      <h3 className="text-sm font-medium mb-2">Datos del Empleado</h3>

      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Recibos de nómina</h4>

        <div className="flex gap-2 mb-2">
          <button type="button" onClick={addPayrollReceipt} className="bg-gray-200 px-3 py-1 rounded text-sm">+ Agregar recibo nómina</button>

          <button type="button" disabled={!hasPayrollReceipts} onClick={addPayrollReceipt} className={`px-3 py-1 rounded text-sm ${hasPayrollReceipts ? "bg-gray-200" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
            Agregar otro recibo nómina
          </button>
        </div>

        {payrollReceipts.length === 0 && <div className="text-sm text-gray-500">No hay recibos.</div>}

        <div className="space-y-3">
          {payrollReceipts.map((r, idx) => (
            <div key={r.id} className="grid grid-cols-12 gap-2 items-start border-b pb-3">
              <div className="col-span-12">
                <label className="block text-xs font-medium">Empleado</label>
                <div className="flex gap-2">
                  <select className="flex-1 border rounded px-3 py-2" value={r.employeeId ?? ""} onChange={(e) => updatePayrollReceipt(idx, { employeeId: e.target.value })}>
                    <option value="">-- Seleccionar de bandeja (EMPLEADO) --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} • {emp.document ?? ""}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setReceiptEmployeeFormIndex(idx);
                      setEditingEmployeeId(undefined);
                      setShowNewEmployeeForm(true);
                      setNewEmployeeDraft({ firstName: "", lastName: "", document: "", nit: "", phone: "", email: "", address: "", city: "", country: "", bank: "", bankAccount: "", birthDate: "", photoDataUrl: undefined });
                      setEmployeePhotoPreview(undefined);
                    }}
                    className="px-3 py-2 bg-gray-200 rounded"
                  >
                    +
                  </button>
                </div>

                <div className="text-xs text-gray-600 mt-1">
                  {r.employeeId ? (
                    (() => {
                      const emp = employees.find((e) => e.id === r.employeeId);
                      return emp ? `${emp.firstName} ${emp.lastName} • ${emp.document ?? ""}` : "Empleado eliminado (id no encontrado)";
                    })()
                  ) : r.employeeSnapshot ? (
                    `${r.employeeSnapshot.firstName ?? ""} ${r.employeeSnapshot.lastName ?? ""} (sin registrar)`
                  ) : (
                    <span className="text-gray-400">No hay empleado asignado</span>
                  )}
                </div>
              </div>

              <div className="col-span-4">
                <label className="block text-xs font-medium">Nombre del recibo</label>
                <input className="w-full border rounded px-2 py-1" value={r.name} onChange={(e) => updatePayrollReceipt(idx, { name: e.target.value })} />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium">Número de recibo</label>
                <input className="w-full border rounded px-2 py-1" value={r.number} onChange={(e) => updatePayrollReceipt(idx, { number: e.target.value })} placeholder="Ej. R-00001234" />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium">Destino</label>
                <select className="w-full border rounded px-2 py-1" value={r.destination} onChange={(e) => updatePayrollReceipt(idx, { destination: e.target.value as any, bank: e.target.value === 'BANCO' ? r.bank : '', caja: e.target.value === 'CAJA' ? r.caja : '' })}>
                  <option value="BANCO">Banco</option>
                  <option value="CAJA">Caja</option>
                </select>
              </div>

              {r.destination === 'BANCO' && (
                <>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium">Banco</label>
                    <input className="w-full border rounded px-2 py-1" value={r.bank} onChange={(e) => updatePayrollReceipt(idx, { bank: e.target.value })} />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium">Tipo de pago</label>
                    <select className="w-full border rounded px-2 py-1" value={r.paymentType ?? ''} onChange={(e) => updatePayrollReceipt(idx, { paymentType: e.target.value as any })}>
                      <option value="">-- Selecciona --</option>
                      <option value="DEBITO">Débito</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="CREDITO">Crédito</option>
                      <option value="PAGOMOVIL">Pago móvil</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium">Número de referencia</label>
                    <input className="w-full border rounded px-2 py-1" value={r.reference} onChange={(e) => updatePayrollReceipt(idx, { reference: e.target.value })} placeholder="Ej. 1234567890" />
                  </div>
                </>
              )}

              {r.destination === 'CAJA' && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium">Caja</label>
                  <input className="w-full border rounded px-2 py-1" value={r.caja} onChange={(e) => updatePayrollReceipt(idx, { caja: e.target.value })} />
                </div>
              )}

              <div className="col-span-2">
                <label className="block text-xs font-medium">Monto</label>
                <input type="number" step="0.01" min="0" className="w-full border rounded px-2 py-1" value={String(r.amount)} onChange={(e) => updatePayrollReceipt(idx, { amount: e.target.value === '' ? 0 : parseFloat(e.target.value) })} />
              </div>

              <div className="col-span-12 mt-2">
                <div className="flex justify-end">
                  <button type="button" onClick={() => removePayrollReceipt(idx)} className="text-sm text-red-600">Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t pt-3 flex justify-end gap-4">
          <div className="text-right">
            <div className="text-sm">Subtotal</div>
            <div className="font-medium">{payrollReceipts.reduce((s, r) => s + (Number(r.amount) || 0), 0).toFixed(2)}</div>
          </div>
        </div>

      </div>

      {showNewEmployeeForm && (
        <div className="border rounded p-3 bg-gray-50 mt-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium">Nombre</label>
              <input className="w-full border rounded px-2 py-1" value={newEmployeeDraft.firstName} onChange={(e) => setNewEmployeeDraft((d: any) => ({ ...d, firstName: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-medium">Apellido</label>
              <input className="w-full border rounded px-2 py-1" value={newEmployeeDraft.lastName} onChange={(e) => setNewEmployeeDraft((d: any) => ({ ...d, lastName: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-medium">RIF / Cédula</label>
              <input className="w-full border rounded px-2 py-1" value={(newEmployeeDraft as any).document} onChange={(e) => setNewEmployeeDraft((d: any) => ({ ...d, document: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-medium">Teléfono</label>
              <input className="w-full border rounded px-2 py-1" value={newEmployeeDraft.phone} onChange={(e) => setNewEmployeeDraft((d: any) => ({ ...d, phone: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-medium">Correo</label>
              <input className="w-full border rounded px-2 py-1" value={newEmployeeDraft.email} onChange={(e) => setNewEmployeeDraft((d: any) => ({ ...d, email: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-medium">Dirección</label>
              <input className="w-full border rounded px-2 py-1" value={newEmployeeDraft.address} onChange={(e) => setNewEmployeeDraft((d: any) => ({ ...d, address: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-medium">Banco</label>
              <input className="w-full border rounded px-2 py-1" value={newEmployeeDraft.bank} onChange={(e) => setNewEmployeeDraft((d: any) => ({ ...d, bank: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-medium">Cuenta bancaria</label>
              <input className="w-full border rounded px-2 py-1" value={newEmployeeDraft.bankAccount} onChange={(e) => setNewEmployeeDraft((d: any) => ({ ...d, bankAccount: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-medium">Fecha de nacimiento</label>
              <input type="date" className="w-full border rounded px-2 py-1" value={(newEmployeeDraft as any).birthDate ?? ""} onChange={(e) => setNewEmployeeDraft((d: any) => ({ ...d, birthDate: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-medium">Edad</label>
              <div className="pt-2">{calculateAgeFromDate((newEmployeeDraft as any).birthDate) ?? "-"}</div>
            </div>

            <div>
              <label className="block text-xs font-medium">Ciudad</label>
              <input className="w-full border rounded px-2 py-1" value={newEmployeeDraft.city} onChange={(e) => setNewEmployeeDraft((d: any) => ({ ...d, city: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-medium">País</label>
              <input className="w-full border rounded px-2 py-1" value={newEmployeeDraft.country} onChange={(e) => setNewEmployeeDraft((d: any) => ({ ...d, country: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-medium">Foto (empleado)</label>
              <input type="file" accept="image/*" onChange={(e) => handleNewEmployeePhotoChange(e.target.files)} />
            </div>

            <div className="col-span-2">
              {employeePhotoPreview ? <img src={employeePhotoPreview} alt="preview" className="w-24 h-24 object-cover rounded" /> : <div className="text-xs text-gray-500">No hay foto</div>}
            </div>

            <div className="col-span-3 flex gap-2 mt-2">
              <button type="button" onClick={handleRegisterAndUseEmployee} className="bg-green-600 text-white px-3 py-1 rounded">{editingEmployeeId ? "Guardar cambios y usar" : "Registrar y usar"}</button>
              <button type="button" onClick={handleUseEmployeeWithoutRegister} className="bg-blue-500 text-white px-3 py-1 rounded">Usar sin registrar</button>
              <button type="button" onClick={() => { setShowNewEmployeeForm(false); setNewEmployeeDraft({ firstName: "", lastName: "", document: "", nit: "", phone: "", email: "", address: "", city: "", country: "", bank: "", bankAccount: "", birthDate: "", photoDataUrl: undefined }); setEditingEmployeeId(undefined); setEmployeePhotoPreview(undefined); setReceiptEmployeeFormIndex(null); }} className="bg-gray-200 px-3 py-1 rounded">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
