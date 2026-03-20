// WardrobeTab.jsx — Wardrobe Mode: weather, suggestions, wear trends, wear log
import { useState, useEffect } from "react";

const API = "https://olfactori-production.up.railway.app/api";
const DEFAULT_CITY = "Yorba Linda, CA";
const DEFAULT_LAT  = 33.8886;
const DEFAULT_LON  = -117.8131;

const css = `
  .wardrobe-wrap { max-width: 760px; margin: 0 auto; }
  .wardrobe-divider { border: none; border-top: 1px solid var(--border); margin: 32px 0; }

  /* LOCATION */
  .wardrobe-location { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; flex-wrap: wrap; }
  .wardrobe-location-label { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.1em; flex-shrink: 0; }
  .wardrobe-location-input { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 7px 12px; font-size: 13px; font-family: var(--sans); outline: none; transition: border-color 0.15s; width: 220px; }
  .wardrobe-location-input:focus { border-color: var(--gold); }
  .wardrobe-location-btn { background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text2); padding: 7px 14px; font-size: 12px; cursor: pointer; transition: all 0.15s; font-family: var(--sans); }
  .wardrobe-location-btn:hover { border-color: var(--border2); color: var(--text); }

  /* WEATHER */
  .weather-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 24px; margin-bottom: 24px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
  .weather-icon { font-size: 48px; line-height: 1; }
  .weather-info { flex: 1; }
  .weather-temp { font-family: var(--serif); font-size: 42px; font-weight: 300; color: var(--text); line-height: 1; }
  .weather-desc { font-size: 13px; color: var(--text2); margin-top: 4px; }
  .weather-season { font-size: 11px; color: var(--gold); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; }
  .weather-loading { font-size: 13px; color: var(--text3); display: flex; align-items: center; gap: 8px; }

  /* SECTION TITLE */
  .wardrobe-section-title { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 14px; }

  /* OCCASION */
  .occasion-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 28px; }
  .occasion-btn { background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 14px 10px; text-align: center; cursor: pointer; transition: all 0.15s; color: var(--text2); font-size: 13px; font-family: var(--sans); }
  .occasion-btn:hover { border-color: var(--violet); color: var(--violet); background: rgba(167,139,250,0.08); transform: translateY(-1px); }
  .occasion-btn.active { border-color: var(--gold); color: var(--gold); background: var(--gold-dim); box-shadow: 0 0 10px rgba(201,168,76,0.2); }
  .occasion-icon { font-size: 24px; display: block; margin-bottom: 6px; }

  /* SUGGEST BUTTON */
  .wardrobe-suggest-btn { width: 100%; background: linear-gradient(135deg, var(--gold), #e8b84e); color: var(--bg); border: none; border-radius: 10px; padding: 14px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; letter-spacing: 0.03em; font-family: var(--sans); margin-bottom: 28px; box-shadow: 0 2px 16px rgba(201,168,76,0.25); }
  .wardrobe-suggest-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 24px rgba(201,168,76,0.4); }
  .wardrobe-suggest-btn:disabled { opacity: 0.5; cursor: default; transform: none; }

  /* RESULTS */
  .wardrobe-results { display: flex; flex-direction: column; gap: 14px; }
  .wardrobe-result-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 20px; display: flex; gap: 16px; align-items: flex-start; transition: all 0.15s; cursor: pointer; animation: fadeSlideUp 0.3s ease both; }
  .wardrobe-result-card:nth-child(2) { animation-delay: 0.08s; }
  .wardrobe-result-card:nth-child(3) { animation-delay: 0.16s; }
  .wardrobe-result-card:hover { border-color: var(--gold); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(201,168,76,0.1); }
  .wardrobe-result-card.primary { border-color: var(--gold); background: rgba(201,168,76,0.05); }
  @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .wardrobe-result-img { width: 72px; height: 72px; background: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
  .wardrobe-result-img img { width: 90%; height: 90%; object-fit: contain; }
  .wardrobe-result-info { flex: 1; min-width: 0; }
  .wardrobe-result-rank { font-size: 10px; color: var(--gold); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
  .wardrobe-result-brand { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 3px; }
  .wardrobe-result-name { font-family: var(--serif); font-size: 20px; font-weight: 300; color: var(--text); line-height: 1.2; margin-bottom: 6px; }
  .wardrobe-result-accords { font-size: 12px; color: var(--text2); margin-bottom: 8px; }
  .wardrobe-result-reason { font-size: 12px; color: var(--text3); font-style: italic; line-height: 1.4; }
  .wardrobe-reset { background: none; border: none; color: var(--text3); font-size: 12px; cursor: pointer; margin-top: 16px; font-family: var(--sans); padding: 4px 0; transition: color 0.15s; }
  .wardrobe-reset:hover { color: var(--text2); }

  /* TRENDS */
  .trends-year-controls { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
  .trends-year-btn { background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; color: var(--text2); padding: 5px 12px; font-size: 12px; cursor: pointer; transition: all 0.15s; font-family: var(--sans); }
  .trends-year-btn.active { border-color: var(--violet); color: var(--violet); background: rgba(167,139,250,0.08); }
  .trends-year-btn:hover { border-color: var(--border2); color: var(--text); }
  .trends-year-input { background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; color: var(--text); padding: 5px 10px; font-size: 12px; width: 70px; outline: none; font-family: var(--sans); transition: border-color 0.15s; }
  .trends-year-input:focus { border-color: var(--gold); }
  .trends-year-go { background: var(--gold); border: none; border-radius: 6px; color: var(--bg); padding: 5px 12px; font-size: 12px; cursor: pointer; font-family: var(--sans); font-weight: 600; }
  .trends-total { font-size: 12px; color: var(--text3); margin-bottom: 20px; }
  .trends-empty { font-size: 13px; color: var(--text3); padding: 24px 0; }
  .trends-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
  .trends-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 20px; }
  .trends-card-title { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 14px; }
  .trends-row { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
  .trends-label { font-size: 13px; color: var(--text2); flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .trends-bar-bg { width: 72px; height: 4px; background: var(--bg3); border-radius: 3px; overflow: hidden; flex-shrink: 0; }
  .trends-bar-fill { height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold2)); border-radius: 3px; transition: width 0.5s ease; }
  .trends-val { font-size: 11px; color: var(--text3); width: 18px; text-align: right; flex-shrink: 0; }

  /* RECENTLY WORN */
  .worn-list { display: flex; flex-direction: column; gap: 10px; }
  .worn-item { display: flex; align-items: center; gap: 14px; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 16px; cursor: pointer; transition: all 0.15s; }
  .worn-item:hover { border-color: var(--violet); transform: translateX(3px); box-shadow: -2px 0 0 var(--violet); }
  .worn-img { width: 44px; height: 44px; background: #ffffff; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
  .worn-img img { width: 90%; height: 90%; object-fit: contain; }
  .worn-info { flex: 1; min-width: 0; }
  .worn-brand { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; }
  .worn-name { font-family: var(--serif); font-size: 16px; color: var(--text); }
  .worn-date { font-size: 11px; color: var(--text3); margin-left: auto; flex-shrink: 0; }
  .view-log-btn { width: 100%; background: none; border: 1px solid var(--border); border-radius: 8px; color: var(--text3); padding: 10px; font-size: 12px; cursor: pointer; margin-top: 12px; font-family: var(--sans); transition: all 0.15s; }
  .view-log-btn:hover { border-color: var(--border2); color: var(--text2); }

  /* FULL LOG */
  .log-entry { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border); cursor: pointer; transition: color 0.15s; }
  .log-entry:last-child { border-bottom: none; }
  .log-entry:hover .log-name { color: var(--gold); }
  .log-date-badge { font-size: 11px; color: var(--text3); width: 80px; flex-shrink: 0; }
  .log-name { font-size: 13px; color: var(--text2); flex: 1; transition: color 0.15s; }
  .log-brand { font-size: 11px; color: var(--text3); }
  .load-more-btn { width: 100%; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text3); padding: 10px; font-size: 12px; cursor: pointer; margin-top: 12px; font-family: var(--sans); transition: all 0.15s; }
  .load-more-btn:hover { border-color: var(--border2); color: var(--text2); }
  @media (max-width: 480px) {
    .wardrobe-location-input { width: 100%; }
    .occasion-grid { grid-template-columns: repeat(2, 1fr); }
    .wardrobe-result-name { font-size: 17px; }
  }
`;

const WEATHER_ICONS = { clear:"☀️", cloud:"⛅", rain:"🌧️", snow:"❄️", fog:"🌫️", storm:"⛈️" };
const OCCASIONS = [
  { id:"casual",  label:"Casual",  icon:"👕" },
  { id:"work",    label:"Work",    icon:"💼" },
  { id:"evening", label:"Evening", icon:"🌙" },
  { id:"date",    label:"Date",    icon:"❤️" },
  { id:"gym",     label:"Gym",     icon:"💪" },
  { id:"special", label:"Special", icon:"✨" },
];

function weatherIcon(code) {
  if (code === 0) return WEATHER_ICONS.clear;
  if (code <= 3)  return WEATHER_ICONS.cloud;
  if (code <= 67) return WEATHER_ICONS.rain;
  if (code <= 77) return WEATHER_ICONS.snow;
  if (code <= 82) return WEATHER_ICONS.rain;
  return WEATHER_ICONS.storm;
}
function weatherDesc(code) {
  if (code === 0) return "Clear skies";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 49) return "Foggy";
  if (code <= 59) return "Drizzle";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Rain showers";
  return "Thunderstorms";
}
function parseArr(val) {
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val) || []; } catch { return []; }
}
function imgSrc(f) { return f?.custom_image_url || f?.fragella_image_url || null; }
function buildReason(frag, occasion, season, weather) {
  const accords = parseArr(frag.main_accords).slice(0, 3);
  const parts = [];
  if (accords.length) parts.push(`${accords.join(", ")} profile`);
  if (season) parts.push(`suits ${season.toLowerCase()} weather`);
  if (weather?.peak_f || weather?.temp_f) {
    const t = Math.round(weather.peak_f ?? weather.temp_f);
    if (t >= 75) parts.push("light and fresh for the heat");
    else if (t <= 45) parts.push("rich and warming for cool temperatures");
  }
  if (occasion === "date")    parts.push("elegant and alluring");
  if (occasion === "gym")     parts.push("clean and not overpowering");
  if (occasion === "work")    parts.push("professional and subtle");
  if (occasion === "evening") parts.push("makes a statement after dark");
  return parts.length ? parts.join(" · ") : "A great pick for today";
}

// ── WEAR TRENDS ───────────────────────────────────────────────
function TrendBar({ label, cnt, max }) {
  const pct = max > 0 ? Math.round((cnt / max) * 100) : 0;
  return (
    <div className="trends-row">
      <div className="trends-label" title={label}>{label}</div>
      <div className="trends-bar-bg">
        <div className="trends-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="trends-val">{cnt}</div>
    </div>
  );
}

function WearTrends() {
  const thisYear = new Date().getFullYear();
  const lastYear = thisYear - 1;
  const [year, setYear]         = useState(thisYear);
  const [yearInput, setYearInput] = useState(String(thisYear));
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/insights/wear_trends?year=${year}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year]);

  const goYear = () => {
    const y = parseInt(yearInput);
    if (y > 2000 && y <= thisYear) setYear(y);
  };

  const maxBrand  = Math.max(...(data?.top_brands  || []).map(r => r.cnt), 1);
  const maxAccord = Math.max(...(data?.top_accords || []).map(r => r.cnt), 1);
  const maxNote   = Math.max(...(data?.top_notes   || []).map(r => r.cnt), 1);

  return (
    <div>
      <div className="trends-year-controls">
        <button className={`trends-year-btn ${year===thisYear?"active":""}`}
          onClick={() => { setYear(thisYear); setYearInput(String(thisYear)); }}>{thisYear}</button>
        <button className={`trends-year-btn ${year===lastYear?"active":""}`}
          onClick={() => { setYear(lastYear); setYearInput(String(lastYear)); }}>{lastYear}</button>
        <input className="trends-year-input" value={yearInput}
          onChange={e => setYearInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && goYear()} placeholder="Year" />
        <button className="trends-year-go" onClick={goYear}>Go</button>
      </div>

      {loading && <div className="trends-empty">Loading...</div>}

      {!loading && data && data.total_wears === 0 && (
        <div className="trends-empty">No wear history logged for {year}.</div>
      )}

      {!loading && data && data.total_wears > 0 && (
        <>
          <div className="trends-total">{data.total_wears} wear{data.total_wears !== 1 ? "s" : ""} logged in {year}</div>
          <div className="trends-grid">
            <div className="trends-card">
              <div className="trends-card-title">🏠 Top Brands</div>
              {data.top_brands.map(r => (
                <TrendBar key={r.brand} label={r.brand} cnt={r.cnt} max={maxBrand} />
              ))}
            </div>
            <div className="trends-card">
              <div className="trends-card-title">🎭 Top Accords</div>
              {data.top_accords.map(r => (
                <TrendBar key={r.note_name} label={r.note_name} cnt={r.cnt} max={maxAccord} />
              ))}
            </div>
            <div className="trends-card">
              <div className="trends-card-title">🌿 Top Notes</div>
              {data.top_notes.map(r => (
                <TrendBar key={r.note_name} label={r.note_name} cnt={r.cnt} max={maxNote} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── RECENTLY WORN ─────────────────────────────────────────────
function RecentlyWorn({ onOpenFrag }) {
  const [frags, setFrags]         = useState([]);
  const [showFull, setShowFull]   = useState(false);
  const [log, setLog]             = useState([]);
  const [logTotal, setLogTotal]   = useState(0);
  const [logOffset, setLogOffset] = useState(0);
  const LOG_LIMIT = 50;

  useEffect(() => {
    fetch(`${API}/insights/recently_worn?limit=10`)
      .then(r => r.json())
      .then(d => setFrags(d.fragrances || []))
      .catch(() => {});
  }, []);

  const loadFullLog = () => {
    fetch(`${API}/wear/full?limit=${LOG_LIMIT}&offset=0`)
      .then(r => r.json())
      .then(d => {
        setLog(d.entries || []);
        setLogTotal(d.total || 0);
        setLogOffset(LOG_LIMIT);
        setShowFull(true);
      })
      .catch(() => {});
  };

  const loadMore = () => {
    fetch(`${API}/wear/full?limit=${LOG_LIMIT}&offset=${logOffset}`)
      .then(r => r.json())
      .then(d => {
        setLog(prev => [...prev, ...(d.entries || [])]);
        setLogOffset(prev => prev + LOG_LIMIT);
      })
      .catch(() => {});
  };

  const fmtDate = (s) => {
    if (!s) return "—";
    const d = new Date(s + "T00:00:00");
    return d.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  };

  if (showFull) return (
    <>
      <button className="wardrobe-reset" onClick={() => setShowFull(false)}>← Back to recently worn</button>
      <div style={{marginTop:12}}>
        <div className="wardrobe-section-title" style={{marginBottom:12}}>Full Wear Log · {logTotal} entries</div>
        {log.map((e, i) => (
          <div key={`${e.id}-${i}`} className="log-entry"
            onClick={() => onOpenFrag && onOpenFrag({ id:e.fragrance_id, brand:e.brand, name:e.name, fragella_image_url:e.fragella_image_url, custom_image_url:e.custom_image_url })}>
            <div className="log-date-badge">{fmtDate(e.worn_date)}</div>
            <div style={{flex:1,minWidth:0}}>
              <div className="log-brand">{e.brand}</div>
              <div className="log-name">{e.name}</div>
            </div>
          </div>
        ))}
        {log.length < logTotal && (
          <button className="load-more-btn" onClick={loadMore}>Load more</button>
        )}
      </div>
    </>
  );

  return (
    <>
      <div className="worn-list">
        {frags.length === 0
          ? <div style={{color:"var(--text3)",fontSize:13}}>No wear history yet.</div>
          : frags.map(f => (
            <div key={f.id} className="worn-item" onClick={() => onOpenFrag && onOpenFrag(f)}>
              <div className="worn-img">
                {imgSrc(f)
                  ? <img src={imgSrc(f)} alt="" onError={e => { e.target.style.display="none"; }} />
                  : <span style={{fontSize:20}}>🧴</span>}
              </div>
              <div className="worn-info">
                <div className="worn-brand">{f.brand}</div>
                <div className="worn-name">{f.name}</div>
              </div>
              <div className="worn-date">{fmtDate(f.last_worn_date)}</div>
            </div>
          ))
        }
      </div>
      <button className="view-log-btn" onClick={loadFullLog}>View Full Log</button>
    </>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────
export default function WardrobeTab({ onOpenFrag }) {
  const [city, setCity]           = useState(DEFAULT_CITY);
  const [cityInput, setCityInput] = useState(DEFAULT_CITY);
  const [coords, setCoords]       = useState({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
  const [weather, setWeather]     = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [occasion, setOccasion]   = useState(null);
  const [results, setResults]     = useState(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    setWeatherLoading(true);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weathercode&daily=temperature_2m_max&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`)
      .then(r => r.json())
      .then(d => {
        const cur    = d.current || {};
        const temp   = cur.temperature_2m ?? 70;
        const code   = cur.weathercode ?? 0;
        const peak   = d.daily?.temperature_2m_max?.[0] ?? temp;
        const month  = new Date().getMonth();
        let season;
        if (month >= 2 && month <= 4)       season = "Spring";
        else if (month >= 5 && month <= 7)  season = "Summer";
        else if (month >= 8 && month <= 10) season = "Fall";
        else                                season = "Winter";
        setWeather({ temp_f: temp, peak_f: peak, code, season });
        setWeatherLoading(false);
      })
      .catch(() => { setWeather({ temp_f: 70, peak_f: 70, code: 0, season: "Spring" }); setWeatherLoading(false); });
  }, [coords]);

  const updateCity = () => {
    const cleaned = cityInput.replace(/,?\s+[A-Z]{2}$/, "").trim();
    fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleaned)}&count=5&country_code=US`)
      .then(r => r.json())
      .then(d => {
        const r = d.results?.[0];
        if (r) { setCoords({ lat: r.latitude, lon: r.longitude }); setCity(`${r.name}${r.admin1 ? ", " + r.admin1 : ""}`); setResults(null); }
      }).catch(() => {});
  };

  const getSuggestions = async () => {
    if (!occasion) return;
    setLoading(true); setResults(null);
    const params = new URLSearchParams({ occasion });
    params.set("lat", coords.lat); params.set("lon", coords.lon);
    if (weather?.peak_f) params.set("peak_temp_f", Math.round(weather.peak_f));
    const res  = await fetch(`${API}/suggest?${params}`);
    const data = await res.json();
    const all  = [data.suggestion, ...(data.alternates || [])].filter(Boolean);
    setResults({ items: all, weather: data.weather || weather, season: data.season || weather?.season });
    setLoading(false);
  };

  const reset = () => { setResults(null); setOccasion(null); };

  return (
    <>
      <style>{css}</style>
      <div className="wardrobe-wrap">

        {/* LOCATION */}
        <div className="wardrobe-location">
          <span className="wardrobe-location-label">📍 Location</span>
          <input className="wardrobe-location-input" value={cityInput}
            onChange={e => setCityInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && updateCity()}
            placeholder="City, State" />
          <button className="wardrobe-location-btn" onClick={updateCity}>Update</button>
        </div>

        {/* WEATHER */}
        <div className="weather-card">
          {weatherLoading
            ? <div className="weather-loading"><div className="spinner" /> Fetching weather for {city}...</div>
            : weather ? <>
                <div className="weather-icon">{weatherIcon(weather.code)}</div>
                <div className="weather-info">
                  <div style={{display:"flex",alignItems:"baseline",gap:12}}>
                    <div className="weather-temp">{Math.round(weather.temp_f)}°F</div>
                    <div style={{fontSize:14,color:"var(--text3)"}}>
                      High <span style={{color:"var(--gold)",fontWeight:500}}>{Math.round(weather.peak_f)}°F</span>
                    </div>
                  </div>
                  <div className="weather-desc">{weatherDesc(weather.code)} · {city}</div>
                  <div className="weather-season">{weather.season}</div>
                </div>
              </>
            : <div className="weather-loading">Unable to fetch weather</div>
          }
        </div>

        {/* OCCASION + SUGGEST */}
        {!results && <>
          <div className="wardrobe-section-title">What are you doing today?</div>
          <div className="occasion-grid">
            {OCCASIONS.map(o => (
              <button key={o.id} className={`occasion-btn ${occasion===o.id?"active":""}`}
                onClick={() => setOccasion(o.id)}>
                <span className="occasion-icon">{o.icon}</span>{o.label}
              </button>
            ))}
          </div>
          <button className="wardrobe-suggest-btn" onClick={getSuggestions}
            disabled={!occasion || loading || weatherLoading}>
            {loading ? "Finding your match..." : "🎯 What Should I Wear?"}
          </button>
        </>}

        {/* RESULTS */}
        {results && <>
          <div className="wardrobe-section-title" style={{marginBottom:16}}>
            Recommended for {OCCASIONS.find(o=>o.id===occasion)?.label} · High {Math.round(results.weather?.peak_f ?? weather?.peak_f ?? results.weather?.temp_f ?? weather?.temp_f)}°F · {results.season}
          </div>
          <div className="wardrobe-results">
            {results.items.map((frag, i) => (
              <div key={frag.id} className={`wardrobe-result-card ${i===0?"primary":""}`}
                onClick={() => onOpenFrag && onOpenFrag(frag)}>
                <div className="wardrobe-result-img">
                  {imgSrc(frag)
                    ? <img src={imgSrc(frag)} alt="" onError={e=>{e.target.style.display="none";}} />
                    : <span style={{fontSize:28}}>🧴</span>}
                </div>
                <div className="wardrobe-result-info">
                  <div className="wardrobe-result-rank">{i===0?"⭐ Top Pick":`Alternative ${i}`}</div>
                  <div className="wardrobe-result-brand">{frag.brand}</div>
                  <div className="wardrobe-result-name">{frag.name}</div>
                  <div className="wardrobe-result-accords">{parseArr(frag.main_accords).slice(0,4).join(" · ")}</div>
                  <div className="wardrobe-result-reason">{buildReason(frag, occasion, results.season, results.weather)}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="wardrobe-reset" onClick={reset}>← Try a different occasion</button>
        </>}

        <hr className="wardrobe-divider" />

        {/* WEAR TRENDS */}
        <div className="wardrobe-section-title">Wear Trends</div>
        <WearTrends />

        <hr className="wardrobe-divider" />

        {/* RECENTLY WORN */}
        <div className="wardrobe-section-title">Recently Worn</div>
        <RecentlyWorn onOpenFrag={onOpenFrag} />

      </div>
    </>
  );
}
