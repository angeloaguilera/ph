"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Module = { name: string; path: string };

const modules: Module[] = [
  { name: "Accounting", path: "/finance/accounting" },
  { name: "Bank Reconciliation Hub", path: "/finance/accounting/bank-reconciliation-hub" },
  { name: "Cash Flow Analytics", path: "/finance/accounting/cash-flow-analytics" },
  { name: "Cash Management Flow", path: "/finance/accounting/cash-management-flow" },
  { name: "Chart of Accounts Core", path: "/finance/accounting/chart-of-accounts-core" },
  { name: "Financial Position Dashboard", path: "/finance/accounting/financial-position-dashboard" },
  { name: "Profit & Loss Insights", path: "/finance/accounting/profit-loss-insights" },
  { name: "Smart Journal Entries", path: "/finance/accounting/smart-journal-entries" },
  { name: "VAT & Tax Control", path: "/finance/accounting/vat-tax-control" },
];

export default function AccountingMenu() {
  const pathname = usePathname() || "";

  return (
    <nav aria-label="Accounting menu">
      <ol className="list-decimal list-inside space-y-2">
        {modules.map((mod, idx) => {
          const isActive = pathname === mod.path || pathname.startsWith(mod.path + "/");
          return (
            <li key={mod.path} className="flex items-center">
              <Link
                href={mod.path}
                className={
                  "px-3 py-1 rounded-md transition-colors text-sm " +
                  (isActive
                    ? "font-semibold underline underline-offset-4"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800")
                }
                aria-current={isActive ? "page" : undefined}
              >
                {mod.name}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
