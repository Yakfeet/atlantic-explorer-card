# Atlantic Explorer Card for Home Assistant

🇳🇱 [Nederlandse versie](README.md)

An animated dashboard card for the **Atlantic Explorer V5** heat pump water heater (`custom:atlantic-explorer-card`). The card draws the water heater as a single unit: the heat pump module with evaporator and fan on top, the insulated tank below with the condenser coil. The fan spins, the coil flows, and the water changes from blue to orange with the water temperature.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/boiler-dark.gif">
    <img src="images/boiler-light.gif" alt="Atlantic Explorer V5 card" width="380">
  </picture>
</p>

<p align="center"><em>Example with demo values. In Home Assistant the animations follow the live status.</em></p>

The look is inspired by [AMensink/warmtepomp-cards](https://github.com/AMensink/warmtepomp-cards) (MIT). The code was written from scratch. Card labels are in Dutch. Animations stop automatically if your device has "reduce motion" enabled.

Do you have a Panasonic monoblock? There is a separate card for that: `panasonic-monoblock-card`.

---

## Installation

### Via HACS (recommended)

1. Open **HACS** in Home Assistant.
2. Click ⋮ in the top right → **Custom repositories**.
3. Paste the URL of this repository, choose type **Dashboard** and click **Add**.
4. Search for **Atlantic Explorer Card**, click **Download** and reload the browser (Ctrl+F5).

### Manual

1. Download `dist/atlantic-explorer-card.js` and place it in `/config/www/`.
2. Go to **Settings → Dashboards → ⋮ → Resources → Add resource**.
3. URL: `/local/atlantic-explorer-card.js`, type: **JavaScript module**.
4. Reload the browser.

---

## Usage

Edit a dashboard, choose **Add card**, open the card's YAML editor and fill in your own entities under `entities:`. Only what you fill in is shown: missing values, chips and tiles are left out. Click a value in the card to open that entity's details dialog.

```yaml
type: custom:atlantic-explorer-card
title: Warmtepompboiler
min_temp: 15
max_temp: 60
entities:
  tank_temp: sensor.explorer_midden_temp
  setpoint: sensor.explorer_target
  air_in: sensor.explorer_inlaat_temp
  air_out: sensor.explorer_uitblaas_temp
  power: sensor.explorer_vermogen
  energy_total: sensor.explorer_verbruik_totaal
  cop: sensor.explorer_cop_laatste_cyclus
  available_liters: sensor.explorer_38c_geschat
  remaining_minutes: sensor.explorer_38c_resterend
  pv_boost: switch.wpboiler_pv_boost
```

### Options

| Option | Description | Default |
| --- | --- | --- |
| `title` | Card title | `Warmtepompboiler` |
| `min_temp` | Temperature that counts as "cold" (colour and percentage) | `15` |
| `max_temp` | Temperature that counts as "hot" | `60` |
| `reverse_flow` | Reverses the flow animation in the coil and the air arrows | `false` |
| `image` | Optional: your own cutaway image instead of the drawing, see below | empty |

### Entities

| Key | Meaning |
| --- | --- |
| `water_heater` | `water_heater` entity (e.g. via Overkiz/Cozytouch). Used for temperature, target and mode when the separate sensors are missing |
| `tank_temp` | Water temperature in the middle of the tank |
| `tank_top` / `tank_bottom` | Top and bottom of the tank, if you have those sensors |
| `setpoint` | Target temperature |
| `air_in` / `air_out` | Air temperature before and after the evaporator |
| `coil` / `exhaust` / `return_gas` | Evaporator, discharge gas and suction gas temperature |
| `eev` | Expansion valve position |
| `power` | Electrical power (W) |
| `energy_today` / `energy_month` / `energy_total` | Energy used today / this month / in total (kWh) |
| `cop` | COP of the last cycle |
| `available_liters` | Available hot water (L) |
| `remaining_minutes` | Remaining hot water time (min) |
| `runtime_defrost` | Run time until the next defrost (min) |
| `pv_boost` | Switch for boosting on solar power |
| `compressor` | Heat pump active on/off. Without it, "active" is derived from power (> 50 W) |
| `heater` | Electric element on/off |
| `defrost` / `online` / `fault` | Defrost, online status and fault |
| `away` | Away mode |
| `mode` | Mode (Eco+, Manual, Programmed) |

---

## Using your own photo

By default the card draws the water heater itself. If you prefer a photo of the cutaway, put your own image in `/config/www/` and point to it:

```yaml
type: custom:atlantic-explorer-card
image: /local/atlantic-explorer.webp
```

The animations (coil, fan, element) and the water colour are drawn on top of the photo. The image has to meet three requirements:

- the **cutaway photo of the Explorer V5** (module with fan on top, tank with coil below),
- a **transparent background** (PNG or WebP),
- an **aspect ratio of 1036 × 2500** (any scale works as long as the ratio is right).

Product photos are owned by Atlantic. Do not include them in a public repository.

---

## Good to know

- The flow in the coil runs from top to bottom: hot gas enters at the top and leaves at the bottom towards the expansion valve. If it looks reversed on your setup, set `reverse_flow: true`.
- The "compressor active" state is derived from power if you do not provide a `compressor` sensor.
- An entity that does not exist is silently skipped. If a value stays empty, check that the entity ID is correct.

## License

MIT
