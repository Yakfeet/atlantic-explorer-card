/*
 * Atlantic Explorer V5 Card
 * custom:atlantic-explorer-card -> Atlantic Explorer V5 warmtepompboiler
 * Opmaak geïnspireerd op AMensink/warmtepomp-cards (MIT); code volledig zelf geschreven.
 *
 * Stroomrichting: de animatie loopt altijd in de tekenrichting van het pad.
 * Met `reverse_flow: true` draai je alle stroomanimaties om.
 */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const isNum = (v) => v !== null && v !== undefined && !isNaN(v);
const fmt = (v, d = 1, u = '') =>
  isNum(v) ? Number(v).toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d }) + u : '–';
const fmtP = (w) => (!isNum(w) ? '–' : Math.abs(w) >= 1000 ? fmt(w / 1000, 2, ' kW') : fmt(w, 0, ' W'));
const fmtMin = (m) => (!isNum(m) ? '–' : m >= 60 ? `${Math.floor(m / 60)} u ${Math.round(m % 60)} min` : `${Math.round(m)} min`);
const STOPS = [[0, [47, 128, 208]], [0.28, [60, 190, 235]], [0.42, [240, 220, 150]], [0.58, [250, 170, 60]], [0.8, [245, 110, 40]], [1, [225, 50, 40]]];
const tempColor = (t, lo = 15, hi = 60) => {
  if (!isNum(t)) return '#9aa5b1';
  const k = clamp((t - lo) / (hi - lo), 0, 1);
  for (let i = 1; i < STOPS.length; i++) {
    if (k <= STOPS[i][0]) {
      const [k0, c0] = STOPS[i - 1], [k1, c1] = STOPS[i];
      const f = (k - k0) / (k1 - k0);
      return `rgb(${c0.map((v, j) => Math.round(v + (c1[j] - v) * f)).join(',')})`;
    }
  }
  return 'rgb(225,50,40)';
};
const ON_STATES = ['on', 'true', 'heating', 'heat', 'running', 'active', 'defrosting', 'open', 'online', 'connected'];
const OK_STATES = ['0', 'off', 'none', 'no fault', 'unknown', 'unavailable', '', 'false', 'ok', 'normal'];
const MODE_NL = { heat: 'Verwarmen', heating: 'Verwarmen', cool: 'Koelen', cooling: 'Koelen', off: 'Uit', auto: 'Auto', manual: 'Handmatig', eco: 'Eco+', 'eco+': 'Eco+', program: 'Programma', programmed: 'Programma', performance: 'Boost', electric: 'Elektrisch', standard: 'Standaard' };
const modeText = (v) => (v === null || v === undefined || v === '' ? '' : MODE_NL[String(v).toLowerCase()] || String(v));
const GREY = '#8b9097';

class WPBase extends HTMLElement {
  setConfig(config) {
    if (!config) throw new Error('Geen configuratie');
    this._c = { ...this.constructor.defaults(), ...config, entities: { ...(config.entities || {}) } };
    this._uid = 'u' + Math.random().toString(36).slice(2, 8);
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._sig = null;
    if (this._hass) this._render();
  }
  set hass(h) {
    this._hass = h;
    if (!this._c) return;
    const sig = Object.values(this._c.entities).map((id) => (h.states[id] ? h.states[id].last_updated : '-')).join('|');
    if (sig !== this._sig) { this._sig = sig; this._render(); }
  }
  getCardSize() { return 8; }
  _st(key) { const id = this._c.entities[key]; return id ? this._hass.states[id] : undefined; }
  _n(key) { const s = this._st(key); if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  _attr(key, a) { const s = this._st(key); return s && s.attributes ? s.attributes[a] : undefined; }
  _has(key) { return !!this._st(key); }
  _on(key) {
    const s = this._st(key);
    if (!s) return false;
    if (ON_STATES.includes(String(s.state).toLowerCase())) return true;
    const v = parseFloat(s.state);
    return !isNaN(v) && v > 0;
  }
  _fault() { const s = this._st('fault'); return !!s && !OK_STATES.includes(String(s.state).toLowerCase()); }
  _wire() {
    this.shadowRoot.querySelectorAll('[data-e]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = this._c.entities[el.dataset.e];
        if (id) this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: id } }));
      });
    });
  }

  /* leiding met bewegende stippen; de stroom loopt van het begin naar het einde van `d` */
  _pipe(d, col, on, w = 6, dur = 1.4) {
    return `<path d="${d}" fill="none" stroke="${on ? col : GREY}" stroke-opacity="${on ? 0.95 : 0.45}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>` +
      (on ? `<path class="flow" style="--flow:${dur}s" d="${d}" fill="none" stroke="#fff3df" stroke-opacity=".85" stroke-width="${Math.max(2, w * 0.4)}"/>` : '');
  }
  _fan(cx, cy, r, on, dur, grille, _op, hub = true) {
    const blades = [0, 120, 240].map((a) =>
      `<ellipse cx="${cx}" cy="${cy - r * 0.52}" rx="${r * 0.3}" ry="${r * 0.5}" fill="#b9bfc6" stroke="rgba(0,0,0,.18)" transform="rotate(${a} ${cx} ${cy})"/>`).join('');
    let g = '';
    if (grille) {
      g = [0.97, 0.72, 0.47].map((k) => `<circle cx="${cx}" cy="${cy}" r="${r * k}" fill="none" stroke="rgba(150,150,150,.35)"/>`).join('') +
        Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * r * 0.97}" y2="${cy + Math.sin(a) * r * 0.97}" stroke="rgba(150,150,150,.28)"/>`; }).join('');
    }
    return `${g}<g class="sp ${on ? 'spin' : ''}" style="transform-origin:${cx}px ${cy}px;--spin:${dur}s">${blades}</g>${hub ? `<circle cx="${cx}" cy="${cy}" r="${r * 0.15}" fill="#6b7078"/>` : ''}`;
  }
  _pump(x, y, on) {
    const col = on ? '#3fcf5a' : '#6b7078';
    return `<circle cx="${x}" cy="${y}" r="12" style="fill:var(--card-background-color)" stroke="${col}" stroke-width="2.5"/>
      <g class="sp ${on ? 'spin' : ''}" style="transform-origin:${x}px ${y}px;--spin:1s" stroke="${col}" stroke-width="2.5" stroke-linecap="round" fill="none"><path d="M${x} ${y} v-7 M${x} ${y} l6 3.5 M${x} ${y} l-6 3.5"/></g>`;
  }
  _chip(label, on, key) { return `<span class="chip ${on ? 'on' : ''}" ${key ? `data-e="${key}"` : ''}><i class="dot"></i>${label}</span>`; }
  _stat(label, value, key) { return `<div class="stat" ${key ? `data-e="${key}"` : ''}><span>${label}</span><b>${value}</b></div>`; }
  _shell(title, pill, body) {
    this.shadowRoot.innerHTML = `
    <style>
      ha-card{display:block;padding:16px;overflow:hidden}
      .head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}
      .title{font-size:1.1rem;font-weight:600;color:var(--primary-text-color)}
      .pill{font-size:.82rem;padding:6px 14px;border-radius:999px;background:rgba(255,120,40,.16);color:#ff9a55;white-space:nowrap}
      .pill.idle{background:var(--secondary-background-color);color:var(--secondary-text-color)}
      .pill.fault{background:rgba(219,68,55,.2);color:#ff6b5e}
      svg{width:100%;height:auto;display:block}
      svg text{font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif)}
      .lbl{fill:var(--secondary-text-color);font-size:11.5px}
      .val{fill:var(--primary-text-color);font-size:14px;font-weight:700}
      .zone{fill:var(--secondary-text-color);font-size:10.5px;letter-spacing:1.6px}
      [data-e]{cursor:pointer}
      .chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px}
      .chip{display:inline-flex;align-items:center;gap:7px;font-size:.78rem;padding:5px 12px 5px 10px;border-radius:999px;background:var(--secondary-background-color);color:var(--secondary-text-color)}
      .chip.on{color:var(--primary-text-color)}
      .dot{width:8px;height:8px;border-radius:50%;background:#5b6068;display:inline-block}
      .chip.on .dot{background:#3fcf5a}
      .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:8px;margin-top:8px}
      .stat{background:var(--secondary-background-color);border-radius:12px;padding:10px 14px}
      .stat span{display:block;font-size:.74rem;color:var(--secondary-text-color);margin-bottom:3px}
      .stat b{display:block;font-size:1.02rem;color:var(--primary-text-color);font-weight:600;white-space:nowrap}
      .sp{transform-box:view-box}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes flow{to{stroke-dashoffset:-22}}
      @keyframes air{to{stroke-dashoffset:-20}}
      @keyframes rise{0%{opacity:0;transform:translateY(6px)}50%{opacity:.7}100%{opacity:0;transform:translateY(-8px)}}
      @keyframes glow{0%,100%{opacity:.55}50%{opacity:1}}
      .spin{animation:spin var(--spin,1s) linear infinite}
      .flow{stroke-dasharray:1 10;stroke-linecap:round;animation:flow var(--flow,1.4s) linear infinite}
      .air{stroke-dasharray:5 5;animation:air 1s linear infinite}
      .haze{animation:rise 2s ease-in-out infinite}
      .glow{animation:glow 1.4s ease-in-out infinite}
      svg.rev .flow,svg.rev .air{animation-direction:reverse}
      @media (prefers-reduced-motion:reduce){.spin,.flow,.air,.haze,.glow{animation:none!important}}
    </style>
    <ha-card>
      <div class="head"><div class="title">${title}</div>${pill ? `<div class="pill ${pill.cls || ''}">${pill.text}</div>` : ''}</div>
      ${body}
    </ha-card>`;
    this._wire();
  }
}

/* ================================================================== */
/*  Atlantic Explorer V5                                              */
/* ================================================================== */
/* Geometrie van de Explorer-doorsnede, in pixels van de productfoto (1036 x 2500).
   Zowel de tekening als de optionele foto gebruiken dezelfde coördinaten. */
const EXP = {
  W: 1036, H: 2500,
  shape: [[561,782],[569,783],[577,783],[586,784],[594,785],[602,787],[610,788],[618,790],[626,792],[634,795],[642,797],[649,800],[657,803],[664,806],[671,809],[678,812],[684,816],[691,819],[697,823],[704,828],[710,833],[717,838],[723,844],[730,851],[737,858],[743,865],[750,874],[756,883],[763,893],[769,905],[775,917],[781,931],[786,945],[792,961],[797,978],[802,997],[807,1018],[812,1041],[816,1065],[821,1092],[825,1120],[829,1150],[832,1182],[835,1216],[837,1253],[839,1291],[840,1332],[840,1375],[840,1420],[838,1466],[837,1516],[834,1567],[831,1620],[828,1676],[823,1733],[818,1793],[812,1855],[806,1918],[800,1975],[794,2024],[789,2066],[785,2101],[781,2129],[778,2149],[775,2162],[773,2167],[770,2173],[767,2178],[764,2184],[761,2189],[757,2194],[752,2199],[748,2204],[743,2210],[738,2214],[732,2219],[725,2223],[718,2228],[711,2232],[703,2236],[694,2239],[685,2243],[676,2246],[667,2249],[658,2251],[649,2254],[640,2256],[631,2257],[622,2258],[612,2260],[603,2260],[594,2261],[585,2261],[576,2261],[567,2261],[558,2261],[549,2261],[539,2260],[530,2259],[521,2258],[513,2257],[504,2256],[496,2254],[487,2252],[479,2251],[472,2248],[464,2246],[457,2244],[451,2242],[445,2240],[440,2238],[435,2236],[430,2234],[427,2232],[423,2230],[419,2227],[415,2224],[411,2221],[407,2218],[403,2214],[399,2210],[395,2205],[391,2200],[387,2194],[383,2186],[379,2178],[375,2169],[371,2158],[367,2147],[363,2135],[359,2121],[356,2105],[353,2088],[350,2069],[348,2048],[346,2026],[345,2002],[343,1976],[342,1943],[341,1902],[340,1853],[338,1797],[337,1733],[336,1661],[334,1582],[333,1495],[332,1415],[331,1342],[331,1275],[332,1215],[332,1162],[333,1116],[335,1076],[337,1043],[339,1013],[341,987],[344,964],[346,944],[349,927],[352,913],[354,903],[358,895],[361,888],[364,882],[368,875],[372,869],[376,863],[380,857],[384,852],[389,846],[394,841],[400,836],[406,831],[412,826],[419,822],[427,817],[435,812],[443,808],[452,804],[460,800],[468,797],[476,794],[484,791],[491,789],[499,787],[506,786],[514,785],[521,784],[529,783],[537,782],[545,782],[553,782]],
  poly: [[532,781],[473,792],[405,828],[368,870],[344,928],[328,1191],[328,1298],[337,1308],[328,1317],[328,1336],[334,1342],[356,1320],[454,1307],[482,1336],[456,1362],[356,1375],[343,1365],[328,1380],[335,1389],[328,1396],[339,1886],[349,2092],[360,2143],[381,2190],[413,2225],[444,2241],[507,2258],[581,2263],[653,2255],[726,2227],[765,2187],[750,2171],[783,2142],[783,2131],[766,2114],[792,2082],[774,2063],[796,2034],[777,2013],[799,1991],[799,1980],[782,1963],[805,1935],[787,1913],[810,1883],[792,1862],[815,1839],[815,1829],[798,1811],[821,1784],[802,1762],[827,1732],[807,1711],[831,1686],[812,1661],[835,1631],[816,1610],[837,1589],[818,1562],[840,1537],[843,1255],[834,1146],[811,1015],[787,930],[767,891],[713,832],[662,803],[598,784]],
  stripes: [[1583, 411], [1633, 440], [1682, 470], [1731, 501], [1781, 530], [1830, 556], [1879, 576], [1928, 591], [1976, 615], [2025, 635], [2072, 652], [2121, 668], [2171, 682]],
  fan: [634, 372, 160, 60],
  hot: [444, 1100],
  cold: [440, 2026],
};

class AtlanticExplorerCard extends WPBase {
  static defaults() { return { title: 'Warmtepompboiler', min_temp: 15, max_temp: 60, reverse_flow: false, image: '' }; }
  static getStubConfig() { return { type: 'custom:atlantic-explorer-card', entities: { tank_temp: 'sensor.explorer_midden_temp' } }; }

  _render() {
    if (!this._hass || !this._c) return;
    const c = this._c, u = this._uid;
    const wh = this._st('water_heater');
    const top = this._n('tank_top') ?? this._n('tank_temp') ?? (wh ? parseFloat(wh.attributes.current_temperature) : null);
    const bottom = this._n('tank_bottom') ?? top;
    const onlyMid = !this._has('tank_top') && !this._has('tank_bottom');
    const setpoint = this._n('setpoint') ?? (wh ? parseFloat(wh.attributes.temperature) : null);
    const power = this._n('power');
    const heater = this._on('heater');
    const fault = this._fault();
    const away = this._on('away') || (wh && wh.attributes.away_mode === 'on');
    const defrost = this._on('defrost');
    let hp;
    if (this._has('compressor')) hp = this._on('compressor');
    else if (isNum(power)) hp = power > 50 && !heater;
    else hp = false;
    const modeRaw = (this._st('mode') && this._st('mode').state) || (wh && (wh.attributes.operation_mode || wh.state)) || '';
    const mode = modeText(modeRaw);

    const lo = Number(c.min_temp), hi = Number(c.max_temp);
    const target = isNum(setpoint) ? setpoint : hi;
    const pct = isNum(top) ? clamp(Math.round(((top - lo) / Math.max(1, target - lo)) * 100), 0, 100) : null;
    const topC = tempColor(top, lo, hi), botC = tempColor(bottom, lo, hi);

    /* schaal en positie van de doorsnede in de viewBox */
    const IW = 300, IX = 76, IY = 4, s = IW / EXP.W;
    const X = (x) => +(IX + x * s).toFixed(1), Y = (y) => +(IY + y * s).toFixed(1);
    const VH = Math.round(IY + EXP.H * s + 4);
    const photo = !!c.image && c.image !== 'none';
    const polyFull = 'M' + EXP.shape.map((p) => p.join(' ')).join(' L') + ' Z';
    const polyView = 'M' + EXP.poly.map((p) => `${X(p[0])} ${Y(p[1])}`).join(' L') + ' Z';
    const [fx, fy, fr] = EXP.fan;
    const FX = X(fx), FY = Y(fy);
    const waterTop = Y(781), waterBot = Y(2263);

    /* spiraalstrepen: de gaskoeling stroomt van boven naar onder; vooraan loopt het gas van rechts naar links */
    const stripeD = EXP.stripes.map(([y, l]) => {
      const r = Math.round(858 - (y - 1583) * 62 / 588), m = (l + r) / 2;
      return { full: `M${r} ${y - 17} Q${m} ${y + 1.5} ${l} ${y + 6}`, view: `M${X(r)} ${Y(y - 17)} Q${X(m)} ${Y(y + 1.5)} ${X(l)} ${Y(y + 6)}` };
    });

    /* ---------- onderlaag: foto of tekening ---------- */
    let base;
    if (photo) {
      base = `<image href="${c.image}" x="${IX}" y="${IY}" width="${IW}" height="${+(EXP.H * s).toFixed(1)}" preserveAspectRatio="none"/>
        <rect x="${IX}" y="${IY}" width="${IW}" height="${+(EXP.H * s).toFixed(1)}" fill="url(#${u}t)" clip-path="url(#${u}c)" style="mix-blend-mode:color" opacity=".95" data-e="water_heater"/>
        <rect x="${IX}" y="${IY}" width="${IW}" height="${+(EXP.H * s).toFixed(1)}" fill="url(#${u}t)" clip-path="url(#${u}c)" style="mix-blend-mode:screen" opacity=".16" pointer-events="none"/>`;
    } else {
      base = `<g transform="translate(${IX} ${IY}) scale(${s})">
        <!-- behuizing: één cilinder met bedieningspaneel -->
        <rect x="250" y="20" width="715" height="2450" rx="240" fill="url(#${u}s)" stroke="#bcc2c9" stroke-width="7"/>
        <rect x="62" y="70" width="268" height="2090" rx="48" fill="url(#${u}p)" stroke="#aeb4bb" stroke-width="6"/>
        <rect x="104" y="440" width="74" height="230" rx="20" fill="#2a2e35"/>
        <circle cx="141" cy="500" r="18" fill="${hp ? '#3fcf5a' : '#e0524a'}"/>
        <circle cx="141" cy="760" r="42" fill="#3b4048"/><circle cx="141" cy="760" r="16" fill="#555b64"/>
        <!-- module: verdamper en ventilator -->
        <path d="M395 560 V330 Q395 150 634 150 Q870 150 870 330 V560 Z" fill="#33373d"/>
        ${Array.from({ length: 26 }, (_, i) => `<line x1="402" y1="${176 + i * 14.5}" x2="862" y2="${176 + i * 14.5}" stroke="#a9805a" stroke-width="6" stroke-opacity=".85"/>`).join('')}
        <circle cx="${fx}" cy="${fy}" r="${fr}" fill="#f6f7f9" stroke="#d3d7dc" stroke-width="8"/>
        <circle cx="${fx}" cy="${fy}" r="118" fill="#d4d9df"/>
        <rect x="380" y="500" width="500" height="74" rx="22" fill="#eceef1" stroke="#c3c8ce" stroke-width="6"/>
        <!-- isolatie, tank en water -->
        <path d="${polyFull}" fill="#d9b978" stroke="#d9b978" stroke-width="112" stroke-linejoin="round"/>
        <path d="${polyFull}" fill="#1c2025" stroke="#1c2025" stroke-width="24" stroke-linejoin="round"/>
        <path d="${polyFull}" fill="url(#${u}t)"/>
        <path d="${polyFull}" fill="url(#${u}h)"/>
        ${stripeD.map((d) => `<path d="${d.full}" fill="none" stroke="#f1f4f7" stroke-width="40"/><path d="${d.full}" fill="none" stroke="#ffffff" stroke-opacity=".6" stroke-width="12" transform="translate(0 -9)"/>`).join('')}
        <!-- element + voeler -->
        <line x1="520" y1="1322" x2="800" y2="1300" stroke="#7d848c" stroke-width="16" stroke-linecap="round"/>
        <rect x="337" y="1296" width="190" height="20" rx="10" fill="#d3d8de"/><rect x="337" y="1340" width="190" height="20" rx="10" fill="#d3d8de"/>
        <!-- aansluitingen -->
        <circle cx="${EXP.hot[0]}" cy="${EXP.hot[1]}" r="66" fill="#e98a8f" stroke="#cf5d66" stroke-width="8"/><circle cx="${EXP.hot[0]}" cy="${EXP.hot[1]}" r="26" fill="#f4f4f5" stroke="#9aa0a6" stroke-width="8"/>
        <circle cx="${EXP.cold[0]}" cy="${EXP.cold[1]}" r="66" fill="#8f8fe3" stroke="#6a6ac4" stroke-width="8"/><circle cx="${EXP.cold[0]}" cy="${EXP.cold[1]}" r="26" fill="#f4f4f5" stroke="#9aa0a6" stroke-width="8"/>
      </g>
      <path d="${polyView}" fill="none" stroke="none" pointer-events="all" data-e="water_heater"/>`;
    }

    /* ---------- bewegende onderdelen (zelfde plek bij tekening en foto) ---------- */
    const stripeFlow = hp ? stripeD.map((d) =>
      `<path d="${d.view}" fill="none" stroke="#ff9f43" stroke-opacity=".62" stroke-width="10.5" stroke-linecap="butt"/>
       <path class="flow" style="--flow:1.8s" d="${d.view}" fill="none" stroke="#c2410c" stroke-width="3.4"/>`).join('') : '';
    const fan = photo
      ? (hp ? `<g opacity=".42">${this._fan(FX, FY, 36, true, 1.0, false, 1, false)}</g>` : '')
      : this._fan(FX, FY, 34, hp, 1.0, false);
    const glow = heater ? `<ellipse class="glow" cx="${X(430)}" cy="${Y(1330)}" rx="${+(150 * s).toFixed(1)}" ry="${+(70 * s).toFixed(1)}" fill="#ff3b30" fill-opacity=".55" data-e="heater"/>` : '';

    /* luchtpijlen: zoals in de eerste versie links in en rechts uit */
    const arrow = (x1, x2, y, delay) => `<line x1="${x1}" y1="${y}" x2="${x2 - 6}" y2="${y}" stroke="${hp ? '#4c8df0' : GREY}" stroke-opacity="${hp ? 0.95 : 0.45}" stroke-width="3" stroke-linecap="round" ${hp ? `class="air" style="animation-delay:${delay}s"` : ''}/>
      <path d="M${x2 - 9} ${y - 6} L${x2} ${y} L${x2 - 9} ${y + 6}" fill="none" stroke="${hp ? '#4c8df0' : GREY}" stroke-opacity="${hp ? 0.95 : 0.45}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    const lbl = (x, y, l, v, key, anchor) => (v === null ? '' : `<text x="${x}" y="${y}" class="lbl" ${anchor ? `text-anchor="${anchor}"` : ''}>${l}</text><text x="${x}" y="${y + 17}" class="val" ${anchor ? `text-anchor="${anchor}"` : ''} ${key ? `data-e="${key}"` : ''}>${v}</text>`);
    const hotY = Y(EXP.hot[1]), coldY = Y(EXP.cold[1]);

    const svg = `
    <svg viewBox="0 0 452 ${VH}" class="${c.reverse_flow ? 'rev' : ''}">
      <defs>
        <linearGradient id="${u}t" gradientUnits="userSpaceOnUse" x1="0" y1="${waterTop}" x2="0" y2="${waterBot}"><stop offset="0" stop-color="${topC}"/><stop offset="1" stop-color="${botC}"/></linearGradient>
        <linearGradient id="${u}tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${topC}"/><stop offset="1" stop-color="${botC}"/></linearGradient>
        <linearGradient id="${u}h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
        <linearGradient id="${u}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#dfe3e8"/><stop offset=".4" stop-color="#ffffff"/><stop offset=".8" stop-color="#eceff2"/><stop offset="1" stop-color="#d3d8de"/></linearGradient>
        <linearGradient id="${u}p" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c9cdd2"/><stop offset=".5" stop-color="#e9ebee"/><stop offset="1" stop-color="#d4d8dd"/></linearGradient>
        <clipPath id="${u}c"><path d="${polyView}"/></clipPath>
      </defs>

      ${base}
      ${stripeFlow}
      ${glow}
      ${fan}

      <!-- temperatuur in de tank -->
      <text x="${X(670)}" y="${Y(960)}" text-anchor="middle" font-size="36" font-weight="700" fill="#fff" stroke="rgba(0,40,90,.35)" stroke-width=".8" paint-order="stroke" data-e="tank_temp">${fmt(top, 0, ' °C')}</text>
      <text x="${X(670)}" y="${Y(960) + 22}" text-anchor="middle" font-size="12.5" fill="#fff" stroke="rgba(0,40,90,.3)" stroke-width=".6" paint-order="stroke" data-e="setpoint">${isNum(setpoint) ? `doel ${fmt(setpoint, 0, ' °C')}` : ''}${pct !== null && isNum(setpoint) ? ` · ${pct}%` : ''}</text>
      ${!onlyMid ? `<text x="${X(670)}" y="${Y(960) + 40}" text-anchor="middle" font-size="10.5" fill="#fff" fill-opacity=".9" stroke="rgba(0,40,90,.3)" stroke-width=".5" paint-order="stroke">boven ${fmt(top, 1, '°')} · onder ${fmt(bottom, 1, '°')}</text>` : ''}

      <!-- lucht in / uit -->
      ${arrow(14, 62, 82, 0)}${arrow(14, 62, 106, 0.25)}${arrow(380, 428, 94, 0.1)}
      ${this._has('air_in') ? lbl(6, 146, 'Lucht in', fmt(this._n('air_in'), 1, ' °C'), 'air_in') : ''}
      ${this._has('air_out') ? lbl(382, 146, 'Lucht uit', fmt(this._n('air_out'), 1, ' °C'), 'air_out') : ''}

      <!-- tapwater -->
      <line x1="6" y1="${hotY}" x2="${X(EXP.hot[0]) - 12}" y2="${hotY}" stroke="#e8551f" stroke-width="3" stroke-linecap="round"/>
      <text x="6" y="${hotY - 7}" class="lbl">Warm uit</text>
      <line x1="6" y1="${coldY}" x2="${X(EXP.cold[0]) - 12}" y2="${coldY}" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/>
      <text x="6" y="${coldY - 7}" class="lbl">Koud in</text>
    </svg>`;

    const chips = [
      this._chip('Compressor', hp, 'compressor'),
      this._chip('Ventilator', hp),
      this._chip('Element', heater, 'heater'),
      this._has('pv_boost') ? this._chip('PV Boost', this._on('pv_boost'), 'pv_boost') : '',
      this._has('defrost') ? this._chip('Ontdooien', defrost, 'defrost') : '',
      this._has('online') ? this._chip('Online', this._on('online'), 'online') : '',
      this._has('fault') ? this._chip('Storing', fault, 'fault') : '',
      away ? this._chip('Afwezig', true) : '',
    ].join('');

    const et = this._n('energy_total');
    const stats = [
      this._has('power') ? this._stat('Vermogen', fmtP(power), 'power') : '',
      this._has('energy_today') ? this._stat('Vandaag', fmt(this._n('energy_today'), 2, ' kWh'), 'energy_today') : '',
      this._has('energy_month') ? this._stat('Deze maand', fmt(this._n('energy_month'), 1, ' kWh'), 'energy_month') : '',
      this._has('energy_total') ? this._stat('Verbruik totaal', fmt(et, isNum(et) && et < 100 ? 2 : 0, ' kWh'), 'energy_total') : '',
      this._has('cop') ? this._stat('COP laatste cyclus', fmt(this._n('cop'), 2), 'cop') : '',
      this._has('available_liters') ? this._stat('Beschikbaar', fmt(this._n('available_liters'), 0, ' L'), 'available_liters') : '',
      this._has('remaining_minutes') ? this._stat('Resterend', fmtMin(this._n('remaining_minutes')), 'remaining_minutes') : '',
      this._has('coil') ? this._stat('Verdamper', fmt(this._n('coil'), 0, ' °C'), 'coil') : '',
      this._has('return_gas') ? this._stat('Zuiggas', fmt(this._n('return_gas'), 0, ' °C'), 'return_gas') : '',
      this._has('exhaust') ? this._stat('Persgas', fmt(this._n('exhaust'), 0, ' °C'), 'exhaust') : '',
      this._has('eev') ? this._stat('Ventiel', fmt(this._n('eev'), 0, ' P'), 'eev') : '',
      this._has('runtime_defrost') ? this._stat('Tot ontdooien', fmtMin(this._n('runtime_defrost')), 'runtime_defrost') : '',
      mode ? this._stat('Modus', mode, 'mode') : '',
      isNum(setpoint) ? this._stat('Doeltemperatuur', fmt(setpoint, 0, ' °C'), 'setpoint') : '',
    ].join('');

    let pill;
    if (fault) pill = { text: 'Storing', cls: 'fault' };
    else if (defrost) pill = { text: 'Ontdooien', cls: '' };
    else if (hp && heater) pill = { text: 'Verwarmen · warmtepomp + element' };
    else if (hp) pill = { text: 'Verwarmen · warmtepomp' };
    else if (heater) pill = { text: 'Verwarmen · element' };
    else if (isNum(top) && isNum(setpoint) && top >= setpoint - 1) pill = { text: 'Op temperatuur', cls: 'idle' };
    else pill = { text: 'Stand-by', cls: 'idle' };

    this._shell(c.title, pill, svg + `<div class="chips">${chips}</div><div class="stats">${stats}</div>`);
  }
}


customElements.define('atlantic-explorer-card', AtlanticExplorerCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'atlantic-explorer-card', name: 'Atlantic Explorer V5', description: 'Geanimeerde kaart voor een Atlantic Explorer V5 warmtepompboiler', preview: false });
