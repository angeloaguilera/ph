import ClientOnly from "../components/ClientOnly";
import RandomClient from "../components/Random.client";
import NowClient from "../components/Now.client";

export default function HomePage() {
  return (
    <>
      <h1>Bienvenido — Página principal</h1>
      <section style={{ marginTop: 20 }}>
        <h2>Valor aleatorio (cliente)</h2>
        <ClientOnly><RandomClient /></ClientOnly>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Fecha/Hora local (cliente)</h2>
        <ClientOnly><NowClient /></ClientOnly>
      </section>
    </>
  );
}

