"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./catalog-manager.module.css";

const TOKEN_KEY = "omegabot_admin_access_token";

type Product = { id: string; sku: string; name: string; family: string; category: string; series?: string | null; environment?: "indoor" | "outdoor" | "vetrina" | "ibrido" | null; technology?: string | null; pixel_pitch_mm?: number | null; brightness_nits?: number | null; refresh_rate_hz?: number | null; ip_rating?: string | null; short_description?: string | null; technical_notes?: string | null; availability_status: "in_stock" | "on_order" | "limited" | "unavailable" | "unknown"; active: boolean };
type Price = { id: string; product_id: string; audience: "public" | "reseller" | "installer" | "internal"; price_type: "unit" | "square_meter" | "configuration" | "starting_from" | "monthly_rental"; currency: string; amount: number; vat_included: boolean; valid_from: string; valid_until?: string | null; note?: string | null; active: boolean };

const emptyProduct: Omit<Product, "id"> = { sku: "", name: "", family: "", category: "", series: "", environment: null, technology: "", pixel_pitch_mm: null, brightness_nits: null, refresh_rate_hz: null, ip_rating: "", short_description: "", technical_notes: "", availability_status: "unknown", active: true };
const emptyPrice: Omit<Price, "id"> = { product_id: "", audience: "public", price_type: "unit", currency: "EUR", amount: 0, vat_included: false, valid_from: new Date().toISOString().slice(0, 10), valid_until: null, note: "", active: true };

export default function CatalogManagerPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [query, setQuery] = useState("");
  const [product, setProduct] = useState<Omit<Product, "id"> & { id?: string }>(emptyProduct);
  const [price, setPrice] = useState<Omit<Price, "id"> & { id?: string }>(emptyPrice);
  const [status, setStatus] = useState("Caricamento catalogo…");
  const [busy, setBusy] = useState(false);

  const token = () => window.sessionStorage.getItem(TOKEN_KEY) ?? "";
  const api = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(path, { ...init, headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...(init?.headers || {}) } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Operazione non riuscita.");
    return data;
  }, []);

  const load = useCallback(async () => {
    try {
      setBusy(true);
      const data = await api(`/api/admin/catalog?q=${encodeURIComponent(query)}`);
      setProducts(data.products || []);
      setPrices(data.prices || []);
      setStatus(`${data.products?.length || 0} prodotti e ${data.prices?.length || 0} prezzi caricati.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Errore di caricamento."); }
    finally { setBusy(false); }
  }, [api, query]);

  useEffect(() => { void load(); }, [load]);

  const pricesByProduct = useMemo(() => new Map(products.map((item) => [item.id, prices.filter((p) => p.product_id === item.id)])), [products, prices]);

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    try {
      setBusy(true);
      await api("/api/admin/catalog", { method: product.id ? "PATCH" : "POST", body: JSON.stringify({ entity: "product", id: product.id, data: { ...product, id: undefined } }) });
      setProduct(emptyProduct); setStatus("Prodotto salvato correttamente."); await load();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Salvataggio non riuscito."); }
    finally { setBusy(false); }
  }

  async function savePrice(event: FormEvent) {
    event.preventDefault();
    try {
      setBusy(true);
      await api("/api/admin/catalog", { method: price.id ? "PATCH" : "POST", body: JSON.stringify({ entity: "price", id: price.id, data: { ...price, id: undefined, amount: Number(price.amount), valid_until: price.valid_until || null } }) });
      setPrice(emptyPrice); setStatus("Prezzo salvato correttamente."); await load();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Salvataggio non riuscito."); }
    finally { setBusy(false); }
  }

  async function remove(entity: "product" | "price", id: string) {
    if (!window.confirm(entity === "product" ? "Eliminare il prodotto e tutti i suoi prezzi?" : "Eliminare questo prezzo?")) return;
    try { setBusy(true); await api("/api/admin/catalog", { method: "DELETE", body: JSON.stringify({ entity, id }) }); setStatus("Elemento eliminato."); await load(); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Eliminazione non riuscita."); }
    finally { setBusy(false); }
  }

  return <main className={styles.shell}>
    <header className={styles.header}><div><p>OmegaLed Data Control</p><h1>Gestione catalogo</h1><span>Crea, modifica, disattiva o elimina prodotti e listini dal back office.</span></div><div className={styles.headerActions}><Link href="/admin/catalog-import">Importa CSV</Link><Link href="/admin">Dashboard</Link></div></header>
    <div className={styles.status}>{status}</div>
    <section className={styles.toolbar}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca SKU, nome, famiglia o categoria"/><button onClick={() => void load()} disabled={busy}>Cerca</button><button onClick={() => { setProduct(emptyProduct); setPrice(emptyPrice); }}>Nuovo</button></section>
    <section className={styles.forms}>
      <form onSubmit={saveProduct} className={styles.panel}><h2>{product.id ? "Modifica prodotto" : "Nuovo prodotto"}</h2><div className={styles.grid}>
        <label>SKU<input required value={product.sku} onChange={(e) => setProduct({ ...product, sku: e.target.value })}/></label><label>Nome<input required value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })}/></label>
        <label>Famiglia<input required value={product.family} onChange={(e) => setProduct({ ...product, family: e.target.value })}/></label><label>Categoria<input required value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })}/></label>
        <label>Serie<input value={product.series || ""} onChange={(e) => setProduct({ ...product, series: e.target.value })}/></label><label>Ambiente<select value={product.environment || ""} onChange={(e) => setProduct({ ...product, environment: (e.target.value || null) as Product["environment"] })}><option value="">Non definito</option><option value="indoor">Indoor</option><option value="outdoor">Outdoor</option><option value="vetrina">Vetrina</option><option value="ibrido">Ibrido</option></select></label>
        <label>Passo pixel<input type="number" step="0.01" value={product.pixel_pitch_mm ?? ""} onChange={(e) => setProduct({ ...product, pixel_pitch_mm: e.target.value ? Number(e.target.value) : null })}/></label><label>Luminosità<input type="number" value={product.brightness_nits ?? ""} onChange={(e) => setProduct({ ...product, brightness_nits: e.target.value ? Number(e.target.value) : null })}/></label>
        <label className={styles.wide}>Descrizione<textarea value={product.short_description || ""} onChange={(e) => setProduct({ ...product, short_description: e.target.value })}/></label>
        <label>Disponibilità<select value={product.availability_status} onChange={(e) => setProduct({ ...product, availability_status: e.target.value as Product["availability_status"] })}><option value="unknown">Da verificare</option><option value="in_stock">Disponibile</option><option value="on_order">Su ordinazione</option><option value="limited">Limitata</option><option value="unavailable">Non disponibile</option></select></label><label className={styles.check}><input type="checkbox" checked={product.active} onChange={(e) => setProduct({ ...product, active: e.target.checked })}/> Prodotto attivo</label>
      </div><div className={styles.actions}><button disabled={busy} type="submit">Salva prodotto</button>{product.id && <button type="button" onClick={() => setProduct(emptyProduct)}>Annulla</button>}</div></form>
      <form onSubmit={savePrice} className={styles.panel}><h2>{price.id ? "Modifica prezzo" : "Nuovo prezzo"}</h2><div className={styles.grid}>
        <label className={styles.wide}>Prodotto<select required value={price.product_id} onChange={(e) => setPrice({ ...price, product_id: e.target.value })}><option value="">Seleziona prodotto</option>{products.map((item) => <option key={item.id} value={item.id}>{item.sku} · {item.name}</option>)}</select></label>
        <label>Pubblico<select value={price.audience} onChange={(e) => setPrice({ ...price, audience: e.target.value as Price["audience"] })}><option value="public">Pubblico</option><option value="reseller">Rivenditore</option><option value="installer">Installatore</option><option value="internal">Interno</option></select></label><label>Tipo<select value={price.price_type} onChange={(e) => setPrice({ ...price, price_type: e.target.value as Price["price_type"] })}><option value="unit">Unità</option><option value="square_meter">Al m²</option><option value="configuration">Configurazione</option><option value="starting_from">A partire da</option><option value="monthly_rental">Canone mensile</option></select></label>
        <label>Importo<input type="number" min="0" step="0.01" required value={price.amount} onChange={(e) => setPrice({ ...price, amount: Number(e.target.value) })}/></label><label>Valido dal<input type="date" required value={price.valid_from} onChange={(e) => setPrice({ ...price, valid_from: e.target.value })}/></label>
        <label>Valido fino al<input type="date" value={price.valid_until || ""} onChange={(e) => setPrice({ ...price, valid_until: e.target.value || null })}/></label><label className={styles.check}><input type="checkbox" checked={price.vat_included} onChange={(e) => setPrice({ ...price, vat_included: e.target.checked })}/> IVA inclusa</label>
        <label className={styles.wide}>Nota<textarea value={price.note || ""} onChange={(e) => setPrice({ ...price, note: e.target.value })}/></label><label className={styles.check}><input type="checkbox" checked={price.active} onChange={(e) => setPrice({ ...price, active: e.target.checked })}/> Prezzo attivo</label>
      </div><div className={styles.actions}><button disabled={busy || !products.length} type="submit">Salva prezzo</button>{price.id && <button type="button" onClick={() => setPrice(emptyPrice)}>Annulla</button>}</div></form>
    </section>
    <section className={styles.list}><h2>Prodotti presenti</h2>{products.map((item) => <article key={item.id} className={styles.card}><div><small>{item.sku}</small><h3>{item.name}</h3><p>{item.family} · {item.category} · {item.active ? "Attivo" : "Disattivato"}</p><span>{pricesByProduct.get(item.id)?.length || 0} prezzi collegati</span></div><div className={styles.cardActions}><button onClick={() => setProduct(item)}>Modifica</button><button onClick={() => setPrice({ ...emptyPrice, product_id: item.id })}>Aggiungi prezzo</button><button className={styles.danger} onClick={() => void remove("product", item.id)}>Elimina</button></div><div className={styles.priceRows}>{pricesByProduct.get(item.id)?.map((p) => <div key={p.id}><span>{p.audience} · {p.price_type}</span><strong>{p.amount.toLocaleString("it-IT", { style: "currency", currency: p.currency })}</strong><button onClick={() => setPrice(p)}>Modifica</button><button onClick={() => void remove("price", p.id)}>×</button></div>)}</div></article>)}</section>
  </main>;
}
