// WardrobeTab.jsx — Wardrobe Mode with weather, occasion picker, and suggestions
import { useState, useEffect } from "react";

const API = "https://olfactori-production.up.railway.app/api";
const DEFAULT_CITY = "Yorba Linda, CA";
const DEFAULT_LAT  = 33.8886;
const DEFAULT_LON  = -117.8131;

const css = `
  .wardrobe-wrap {
    max-width: 720px; margin: 0 auto;
  }

  /* LOCATION BAR */
  .wardrobe-location {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 28px; flex-wrap: wrap;
  }
  .wardrobe-location-label {
    font-size: 11px; color: var(--text3); text-transform: uppercase;
    letter-spacing: 0.1em; flex-shrink: 0;
  }
  .wardrobe-location-input {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: 8px; color: var(--text); padding: 7px 12px;
    font-size: 13px; font-family: 'DM Sans', sans-serif;
    outline: none; transition: border-color 0.15s; width: 220px;
  }
  .wardrobe-location-input:focus { border-color: var(--gold); }
  .wardrobe-location-btn {
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 8px; color: var(--text2); padding: 7px 14px;
    font-size: 12px; cursor: pointer; transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .wardrobe-location-btn:hover { border-color: var(--border2); color: var(--text); }

  /* WEATHER CARD */
  .weather-card {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 20px 24px;
    margin-bottom: 24px;
    display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
  }
  .weather-icon { font-size: 48px; line-height: 1; }
  .weather-info { flex: 1; }
  .weather-temp {
    font-family: 'Cormorant Garamond', serif;
    font-size: 42px; font-weight: 300; color: var(--text);
    line-height: 1;
  }
  .weather-desc {
    font-size: 13px; color: var(--text2); margin-top: 4px;
  }
  .weather-season {
    font-size: 11px; color: var(--gold); text-transform: uppercase;
    letter-spacing: 0.1em; margin-top: 4px;
  }
  .weather-loading {
    font-size: 13px; color: var(--text3);
    display: flex; align-items: center; gap: 8px;
  }

  /* OCCASION SECTION */
  .wardrobe-section-title {
    font-size: 11px; color: var(--text3); text-transform: uppercase;
    letter-spacing: 0.1em; margin-bottom: 14px;
  }
  .occasion-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
    margin-bottom: 28px;
  }
  .occasion-btn {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: 10px; padding: 14px 10px; text-align: center;
    cursor: pointer; transition: all 0.15s; color: var(--text2);
    font-size: 13px; font-family: 'DM Sans', sans-serif;
  }
  .occasion-btn:hover {
    border-color: var(--border2); color: var(--text);
    transform: translateY(-1px);
  }
  .occasion-btn.active {
    border-color: var(--gold); color: var(--gold);
    background: var(--gold-dim);
  }
  .occasion-icon { font-size: 24px; display: block; margin-bottom: 6px; }

  /* SUGGEST BUTTON */
  .wardrobe-suggest-btn {
    width: 100%; background: var(--gold); color: #0c0c0f;
    border: none; border-radius: 10px;
    padding: 14px; font-size: 15px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; letter-spacing: 0.03em;
    font-family: 'DM Sans', sans-serif; margin-bottom: 28px;
  }
  .wardrobe-suggest-btn:hover { background: var(--gold2); transform: translateY(-1px); }
  .wardrobe-suggest-btn:disabled { opacity: 0.5; cursor: default; transform: none; }

  /* RESULTS */
  .wardrobe-results { display: flex; flex-direction: column; gap: 14px; }
  .wardrobe-result-card {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 18px 20px;
    display: flex; gap: 16px; align-items: flex-start;
    transition: all 0.15s; cursor: pointer;
    animation: fadeSlideUp 0.3s ease both;
  }
  .wardrobe-result-card:nth-child(2) { animation-delay: 0.08s; }
  .wardrobe-result-card:nth-child(3) { animation-delay: 0.16s; }
  .wardrobe-result-card:hover { border-color: var(--gold); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
  .wardrobe-result-card.primary { border-color: var(--gold); background: rgba(201,168,76,0.05); }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .wardrobe-result-img {
    width: 72px; height: 72px; background: var(--bg3);
    border-radius: 8px; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0; overflow: hidden;
  }
  .wardrobe-result-img img { width: 90%; height: 90%; object-fit: contain; }
  .wardrobe-result-info { flex: 1; min-width: 0; }
  .wardrobe-result-rank {
    font-size: 10px; color: var(--gold); text-transform: uppercase;
    letter-spacing: 0.1em; margin-bottom: 4px;
  }
  .wardrobe-result-brand {
    font-size: 10px; color: var(--text3); text-transform: uppercase;
    letter-spacing: 0.1em; margin-bottom: 3px;
  }
  .wardrobe-result-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 20px; font-weight: 300; color: var(--text);
    line-height: 1.2; margin-bottom: 6px;
  }
  .wardrobe-result-accords {
    font-size: 12px; color: var(--text2); margin-bottom: 8px;
  }
  .wardrobe-result-reason {
    font-size: 12px; color: var(--text3); font-style: italic;
    line-height: 1.4;
  }

  /* RESET */
  .wardrobe-reset {
    background: none; border: none; color: var(--text3);
    font-size: 12px; cursor: pointer; margin-top: 16px;
    font-family: 'DM Sans', sans-serif; padding: 4px 0;
    transition: color 0.15s;
  }
  .wardrobe-reset:hover { color: var(--text2); }
`;

const WEATHER_ICONS = {
  clear:  "☀️",
  cloud:  "⛅",
  rain:   "🌧️",
  snow:   "❄️",
  fog:    "🌫️",
  storm:  "⛈️",
};

const OCCASIONS = [
  { id:"casual",  label:"Casual",   icon:"👕" },
  { id:"work",    label:"Work",     icon:"💼" },
  { id:"evening", label:"Evening",  icon:"🌙" },
  { id:"date",    label:"Date",     icon:"❤️" },
  { id:"gym",     label:"Gym",      icon:"💪" },
  { id:"special", label:"Special",  icon:"✨" },
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
  if (code === 0)        return "Clear skies";
  if (code === 1)        return "Mainly clear";
  if (code === 2)        return "Partly cloudy";
  if (code === 3)        return "Overcast";
  if (code <= 49)        return "Foggy";
  if (code <= 59)        return "Drizzle";
  if (code <= 67)        return "Rainy";
  if (code <= 77)        return "Snowy";
  if (code <= 82)        return "Rain showers";
  return "Thunderstorms";
}

function parseArr(val) {
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val) || []; } catch { return []; }
}

function imgSrc(f) {
  return f?.custom_image_url || f?.fragella_image_url || null;
}

function buildReason(frag, occasion, season, weather) {
  const accords = parseArr(frag.main_accords).slice(0, 3);
  const parts = [];
  if (accords.length) parts.push(`${accords.join(", ")} profile`);
  if (season) parts.push(`suits ${season.toLowerCase()} weather`);
  if (weather?.temp_f) {
    const t = Math.round(weather.temp_f);
    if (t >= 75) parts.push("light and fresh for the heat");
    else if (t <= 45) parts.push("rich and warming for cool temperatures");
  }
  if (occasion === "date") parts.push("elegant and alluring");
  if (occasion === "gym") parts.push("clean and not overpowering");
  if (occasion === "work") parts.push("professional and subtle");
  if (occasion === "evening") parts.push("makes a statement after dark");
  return parts.length ? parts.join(" · ") : "A great pick for today";
}

export default function WardrobeTab({ onOpenFrag }) {
  const [city, setCity]         = useState(DEFAULT_CITY);
  const [cityInput, setCityInput] = useState(DEFAULT_CITY);
  const [coords, setCoords]     = useState({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
  const [weather, setWeather]   = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [occasion, setOccasion] = useState(null);
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);

  // Fetch weather on coords change
  useEffect(() => {
    setWeatherLoading(true);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weathercode&temperature_unit=fahrenheit`)
      .then(r => r.json())
      .then(d => {
        const cur = d.current || {};
        const temp = cur.temperature_2m ?? 70;
        const code = cur.weathercode ?? 0;
        const month = new Date().getMonth(); // 0=Jan, 11=Dec
        let season;
        if (month >= 2 && month <= 4)       season = "Spring";  // Mar–May
        else if (month >= 5 && month <= 7)  season = "Summer";  // Jun–Aug
        else if (month >= 8 && month <= 10) season = "Fall";    // Sep–Nov
        else                                season = "Winter";   // Dec–Feb
        setWeather({ temp_f: temp, code, season });
        setWeatherLoading(false);
      })
      .catch(() => {
        setWeather({ temp_f: 70, code: 0, season: "Spring" });
        setWeatherLoading(false);
      });
  }, [coords]);

  const updateCity = () => {
    // Strip state abbreviations like "NY" or "CA" — Open-Meteo doesn't handle them
    const cleaned = cityInput
      .replace(/,?\s+[A-Z]{2}$/, "")  // remove ", NY" or " NY" at end
      .trim();
    const q = encodeURIComponent(cleaned);
    fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=5&country_code=US`)
      .then(r => r.json())
      .then(d => {
        const r = d.results?.[0];
        if (r) {
          setCoords({ lat: r.latitude, lon: r.longitude });
          setCity(`${r.name}${r.admin1 ? ", " + r.admin1 : ""}`);
          setResults(null);
        }
      })
      .catch(() => {});
  };

  const getSuggestions = async () => {
    if (!occasion) return;
    setLoading(true);
    setResults(null);
    const params = new URLSearchParams({ occasion });
    params.set("lat", coords.lat);
    params.set("lon", coords.lon);
    const res = await fetch(`${API}/suggest?${params}`);
    const data = await res.json();

    // Build 3-item list: primary + 2 alternates
    const all = [data.suggestion, ...(data.alternates || [])].filter(Boolean);
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
          <input
            className="wardrobe-location-input"
            value={cityInput}
            onChange={e => setCityInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && updateCity()}
            placeholder="City, State"
          />
          <button className="wardrobe-location-btn" onClick={updateCity}>Update</button>
          {city !== cityInput && <span style={{fontSize:12,color:"var(--text3)"}}>Press Update or Enter</span>}
        </div>

        {/* WEATHER */}
        <div className="weather-card">
          {weatherLoading ? (
            <div className="weather-loading"><div className="spinner" /> Fetching weather for {city}...</div>
          ) : weather ? (
            <>
              <div className="weather-icon">{weatherIcon(weather.code)}</div>
              <div className="weather-info">
                <div className="weather-temp">{Math.round(weather.temp_f)}°F</div>
                <div className="weather-desc">{weatherDesc(weather.code)} · {city}</div>
                <div className="weather-season">{weather.season}</div>
              </div>
            </>
          ) : (
            <div className="weather-loading">Unable to fetch weather</div>
          )}
        </div>

        {/* OCCASION */}
        {!results && (
          <>
            <div className="wardrobe-section-title">What are you doing today?</div>
            <div className="occasion-grid">
              {OCCASIONS.map(o => (
                <button
                  key={o.id}
                  className={`occasion-btn ${occasion === o.id ? "active" : ""}`}
                  onClick={() => setOccasion(o.id)}
                >
                  <span className="occasion-icon">{o.icon}</span>
                  {o.label}
                </button>
              ))}
            </div>

            <button
              className="wardrobe-suggest-btn"
              onClick={getSuggestions}
              disabled={!occasion || loading || weatherLoading}
            >
              {loading ? "Finding your match..." : "🎯 What Should I Wear?"}
            </button>
          </>
        )}

        {/* RESULTS */}
        {results && (
          <>
            <div className="wardrobe-section-title" style={{marginBottom:16}}>
              Recommended for {OCCASIONS.find(o=>o.id===occasion)?.label} · {Math.round(results.weather?.temp_f ?? weather?.temp_f)}°F · {results.season}
            </div>
            <div className="wardrobe-results">
              {results.items.map((frag, i) => (
                <div
                  key={frag.id}
                  className={`wardrobe-result-card ${i === 0 ? "primary" : ""}`}
                  onClick={() => onOpenFrag && onOpenFrag(frag)}
                >
                  <div className="wardrobe-result-img">
                    {imgSrc(frag)
                      ? <img src={imgSrc(frag)} alt="" onError={e => { e.target.style.display="none"; }} />
                      : <span style={{fontSize:28}}>🧴</span>
                    }
                  </div>
                  <div className="wardrobe-result-info">
                    <div className="wardrobe-result-rank">
                      {i === 0 ? "⭐ Top Pick" : `Alternative ${i}`}
                    </div>
                    <div className="wardrobe-result-brand">{frag.brand}</div>
                    <div className="wardrobe-result-name">{frag.name}</div>
                    <div className="wardrobe-result-accords">
                      {parseArr(frag.main_accords).slice(0,4).join(" · ")}
                    </div>
                    <div className="wardrobe-result-reason">
                      {buildReason(frag, occasion, results.season, results.weather)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="wardrobe-reset" onClick={reset}>← Try a different occasion</button>
          </>
        )}

      </div>
    </>
  );
}
