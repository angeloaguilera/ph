// frontend/app/api/hr/employees/route.ts
// Ruta API simple para listar y guardar empleados en un archivo local JSON.
// NOTA: esto escribe en el filesystem del servidor donde corre la app.
// En plataformas serverless (Vercel, etc.) el filesystem es efímero — usar una DB en producción.

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

/* ---------------- Types ---------------- */
type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  document?: string;
  employeeNumber?: string;
  position?: string;
  birthDate?: string; // yyyy-mm-dd
  maritalStatus?: "SOLTERO" | "CASADO" | "VIUDO" | "";
  bonoPercent?: number;
  bank?: string;
  bankAccount?: string;
  email?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
};

/* ---------------- File config ---------------- */
const DATA_DIR = path.join(process.cwd(), "data");
const EMPLOYEES_FILE = path.join(DATA_DIR, "employees.json");

/**
 * Ensure the data directory and file exist.
 * If the file doesn't exist we create it as an empty array.
 */
async function ensureEmployeesFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(EMPLOYEES_FILE);
  } catch {
    await fs.writeFile(EMPLOYEES_FILE, "[]", "utf8");
  }
}

/* ---------------- Helpers ---------------- */
const genId = () =>
  (typeof globalThis !== "undefined" && (globalThis as any).crypto && "randomUUID" in (globalThis as any).crypto)
    ? (globalThis as any).crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

async function readEmployees(): Promise<Employee[]> {
  await ensureEmployeesFile();
  const raw = await fs.readFile(EMPLOYEES_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw || "[]");
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

async function writeEmployees(list: Employee[]) {
  await ensureEmployeesFile();
  await fs.writeFile(EMPLOYEES_FILE, JSON.stringify(list, null, 2), "utf8");
}

/* ---------------- GET: List employees ---------------- */
export async function GET() {
  try {
    const employees = await readEmployees();
    return NextResponse.json({ employees }, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/hr/employees error:", err);
    return NextResponse.json({ error: "Error leyendo empleados", detail: String(err?.message ?? err) }, { status: 500 });
  }
}

/* ---------------- POST: Create employee ----------------
 Example expected body (JSON):
 {
   "firstName": "Juan",
   "lastName": "Perez",
   "document": "V-12345678",
   "employeeNumber": "EMP-0001",
   "position": "Tecnico",
   "birthDate": "1990-05-01",
   "maritalStatus": "SOLTERO",
   "bonoPercent": 0,
   "bank": "Banco X",
   "bankAccount": "0123456789",
   "email": "juan@example.com",
   "phone": "0414-1234567"
 }
*/
export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Validación mínima
    if (!payload || !String(payload.firstName || "").trim() || !String(payload.lastName || "").trim()) {
      return NextResponse.json({ error: "firstName y lastName son requeridos" }, { status: 400 });
    }

    const list = await readEmployees();

    const now = new Date().toISOString();
    const employee: Employee = {
      id: genId(),
      firstName: String(payload.firstName).trim(),
      lastName: String(payload.lastName).trim(),
      document: payload.document ? String(payload.document).trim() : undefined,
      employeeNumber: payload.employeeNumber ? String(payload.employeeNumber).trim() : undefined,
      position: payload.position ? String(payload.position).trim() : undefined,
      birthDate: payload.birthDate ? String(payload.birthDate) : undefined,
      maritalStatus: payload.maritalStatus ?? undefined,
      bonoPercent: payload.bonoPercent !== undefined ? Number(payload.bonoPercent) : 0,
      bank: payload.bank ? String(payload.bank).trim() : undefined,
      bankAccount: payload.bankAccount ? String(payload.bankAccount).trim() : undefined,
      email: payload.email ? String(payload.email).trim() : undefined,
      phone: payload.phone ? String(payload.phone).trim() : undefined,
      createdAt: now,
      updatedAt: now,
    };

    // Insert al inicio (como hacía el front)
    list.unshift(employee);
    await writeEmployees(list);

    return NextResponse.json({ employee }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/hr/employees error:", err);
    return NextResponse.json({ error: "Error guardando empleado", detail: String(err?.message ?? err) }, { status: 500 });
  }
}
