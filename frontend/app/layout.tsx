// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "PH",
  description: "Demo para evitar hydration mismatches",
};

// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body suppressHydrationWarning>
        <main style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
          {children}
        </main>
      </body>
    </html>
  );
}

