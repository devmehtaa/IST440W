import { useEffect, useMemo, useState } from "react";

export default function App() {
  const [data, setData] = useState([]);
  const [brand, setBrand] = useState("");
  const [year, setYear] = useState("");
  const [model, setModel] = useState("");
  const [engine, setEngine] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetch("/structured_results.json")
      .then(res => res.json())
      .then(json => {
        const vehicles = Object.values(json).map(entry => ({
          ...entry.Vehicle,
          oils: entry.oil_recommendations
        }));
        setData(vehicles);
      });
  }, []);

  // Cascading dropdown logic
  const brands = [...new Set(data.map(v => v.make).filter(Boolean))];

  const years = useMemo(() => {
    return [...new Set(
      data
        .filter(v => (brand ? v.make === brand : true))
        .map(v => v.year)
        .filter(Boolean)
    )];
  }, [brand, data]);

  const models = useMemo(() => {
    return [...new Set(
      data
        .filter(v =>
          (brand ? v.make === brand : true) &&
          (year ? String(v.year) === year : true)
        )
        .map(v => v.model)
        .filter(Boolean)
    )];
  }, [brand, year, data]);

  const engines = useMemo(() => {
    return [...new Set(
      data
        .filter(v =>
          (brand ? v.make === brand : true) &&
          (year ? String(v.year) === year : true) &&
          (model ? v.model === model : true)
        )
        .map(v => v.engine)
        .filter(Boolean)
    )];
  }, [brand, year, model, data]);

  // Smart keyword search
  const keywordResults = useMemo(() => {
    if (!searched || !searchInput) return [];

    const words = searchInput
      .toLowerCase()
      .split(" ")
      .filter(Boolean);

    return data.filter(v => {
      const combined = `${v.year} ${v.make} ${v.model} ${v.engine || ""}`
        .toLowerCase();

      return words.every(word => combined.includes(word));
    });
  }, [searched, searchInput, data]);

  const dropdownResults = useMemo(() => {
    if (!searched || searchInput) return [];

    return data.filter(v =>
      (brand ? v.make === brand : true) &&
      (year ? String(v.year) === year : true) &&
      (model ? v.model === model : true) &&
      (engine ? v.engine === engine : true)
    );
  }, [searched, brand, year, model, engine, searchInput, data]);

  const results = searchInput ? keywordResults : dropdownResults;

  return (
    <div style={styles.page}>
      <nav style={styles.navbar}>
        <div style={styles.logo}>OilFinder</div>
        <div style={styles.navCenter}>
          <input
            style={styles.topSearch}
            placeholder="Search Honda, Accord, 2000, V6..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button style={styles.navButton} onClick={() => setSearched(true)}>
            Search
          </button>
        </div>
      </nav>

      <section style={styles.heroSection}>
        <h1 style={styles.title}>Find the Perfect Engine Oil</h1>
        <p style={styles.subtitle}>
          Use quick search or select your vehicle below.
        </p>
      </section>

      <section style={styles.filterSection}>
        <div style={styles.filterCard}>
          <select style={styles.select} value={brand}
            onChange={e => { setBrand(e.target.value); setYear(""); setModel(""); setEngine(""); setSearchInput(""); setSearched(false); }}>
            <option value="">Select Brand</option>
            {brands.map(b => <option key={b}>{b}</option>)}
          </select>

          <select style={styles.select} value={year} disabled={!brand}
            onChange={e => { setYear(e.target.value); setModel(""); setEngine(""); setSearchInput(""); setSearched(false); }}>
            <option value="">Select Year</option>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>

          <select style={styles.select} value={model} disabled={!year}
            onChange={e => { setModel(e.target.value); setEngine(""); setSearchInput(""); setSearched(false); }}>
            <option value="">Select Model</option>
            {models.map(m => <option key={m}>{m}</option>)}
          </select>

          <select style={styles.select} value={engine} disabled={!model}
            onChange={e => { setEngine(e.target.value); setSearchInput(""); setSearched(false); }}>
            <option value="">Select Engine</option>
            {engines.map(en => <option key={en}>{en}</option>)}
          </select>

          <button style={styles.primaryButton} onClick={() => setSearched(true)}>
            Get Recommendation
          </button>
        </div>

        {searched && results.length === 0 && (
          <div style={{ color: "white", marginTop: 30 }}>
            No vehicles found.
          </div>
        )}

        {searched && results.map((vehicle, idx) => (
          <div key={idx} style={styles.resultCard}>
            <h2 style={styles.resultTitle}>
              {vehicle.displayName || `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            </h2>

            {vehicle.oils
              .filter(oil => oil.recommended === true)
              .map((oil, i) => (
                <div key={i} style={styles.oilCard}>
                  <div>
                    <div style={styles.oilType}>{oil.oil_type}</div>
                    {oil.temperature_condition !== "normal" && oil.temperature_condition?.below && (
                      <div style={styles.smallText}>
                        Use below {oil.temperature_condition.below.value}°C
                      </div>
                    )}
                    {oil.temperature_condition === "normal" && (
                      <div style={styles.smallText}>
                        Suitable for normal temperatures
                      </div>
                    )}
                  </div>

                  <div style={{ ...styles.statusBadge, background: "#16a34a" }}>
                    Recommended
                  </div>
                </div>
              ))}
          </div>
        ))}
      </section>

      <footer style={styles.footer}>
        © {new Date().getFullYear()} OilFinder Pro
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "linear-gradient(135deg,#0f172a,#1e293b,#334155)",
    fontFamily: "Segoe UI, sans-serif",
    color: "white",
    display: "flex",
    flexDirection: "column"
  },
  navbar: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 60px",
    background: "rgba(0,0,0,0.4)",
    backdropFilter: "blur(12px)"
  },
  navCenter: { display: "flex", gap: "10px", width: "50%" },
  logo: { fontWeight: 700, fontSize: "22px" },
  topSearch: { flex: 1, padding: "12px", borderRadius: "8px", border: "none" },
  navButton: { padding: "12px 20px", borderRadius: "8px", border: "none", background: "#3b82f6", color: "white", cursor: "pointer" },
  heroSection: { textAlign: "center", padding: "80px 20px 40px" },
  title: { fontSize: "54px", fontWeight: 700 },
  subtitle: { opacity: 0.8, marginTop: "15px", fontSize: "18px" },
  filterSection: { width: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" },
  filterCard: {
    width: "100%",
    maxWidth: "1200px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
    gap: "20px",
    background: "rgba(255,255,255,0.08)",
    padding: "30px",
    borderRadius: "20px",
    backdropFilter: "blur(12px)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
  },
  select: {
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    fontSize: "14px"
  },
  primaryButton: {
    gridColumn: "1 / -1",
    padding: "16px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(90deg,#2563eb,#3b82f6)",
    color: "white",
    fontWeight: 600,
    fontSize: "16px",
    cursor: "pointer"
  },
  resultCard: { width: "100%", maxWidth: "1100px", marginTop: "40px", background: "white", color: "black", padding: "40px", borderRadius: "20px" },
  resultTitle: { marginBottom: "25px", fontSize: "24px" },
  oilCard: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", borderRadius: "14px", marginBottom: "15px", background: "#f1f5f9" },
  oilType: { fontWeight: 700, fontSize: "18px" },
  smallText: { fontSize: "13px", color: "gray" },
  statusBadge: { padding: "8px 18px", borderRadius: "20px", color: "white", fontSize: "12px" },
  footer: { marginTop: "auto", textAlign: "center", padding: "20px", opacity: 0.6, fontSize: "13px" }
};