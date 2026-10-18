# Atlantic Explorer Card voor Home Assistant

🇬🇧 [English version](README.en.md)

Een geanimeerde dashboardkaart voor de **Atlantic Explorer V5** warmtepompboiler (`custom:atlantic-explorer-card`). De kaart toont de boiler als één eenheid: de warmtepompmodule met verdamper en ventilator bovenop, de geïsoleerde tank eronder met de condensorspiraal. De ventilator draait, de spiraal stroomt mee en het water kleurt van blauw naar oranje met de watertemperatuur.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/boiler-dark.gif">
    <img src="images/boiler-light.gif" alt="Atlantic Explorer V5-kaart" width="380">
  </picture>
</p>

<p align="center"><em>Voorbeeld met demowaarden. In Home Assistant volgen de animaties de live status.</em></p>

De opmaak is geïnspireerd op [AMensink/warmtepomp-cards](https://github.com/AMensink/warmtepomp-cards) (MIT). De code is opnieuw geschreven. Alle labels zijn in het Nederlands. Animaties stoppen automatisch als je apparaat "verminderde beweging" heeft ingesteld.

Heb je een Panasonic monoblock? Daar is een aparte kaart voor: `panasonic-monoblock-card`.

---

## Installatie

### Via HACS (aanbevolen)

1. Open **HACS** in Home Assistant.
2. Klik rechtsboven op ⋮ → **Aangepaste repositories**.
3. Plak de URL van deze repository, kies type **Dashboard** en klik **Toevoegen**.
4. Zoek **Atlantic Explorer Card**, klik **Downloaden** en herlaad de browser (Ctrl+F5).

### Handmatig

1. Download `dist/atlantic-explorer-card.js` en zet het in `/config/www/`.
2. Ga naar **Instellingen → Dashboards → ⋮ → Resources → Resource toevoegen**.
3. URL: `/local/atlantic-explorer-card.js`, type: **JavaScript-module**.
4. Herlaad de browser.

---

## Gebruik

Bewerk een dashboard, kies **Kaart toevoegen**, open de YAML-editor van de kaart en vul je eigen entiteiten in onder `entities:`. Alleen wat je invult wordt getoond: ontbrekende waarden, chips en tegels worden weggelaten. Klik in de kaart op een waarde om het detailvenster van die entiteit te openen.

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

### Opties

| Optie | Omschrijving | Standaard |
| --- | --- | --- |
| `title` | Titel van de kaart | `Warmtepompboiler` |
| `min_temp` | Temperatuur die als "koud" geldt (kleur en percentage) | `15` |
| `max_temp` | Temperatuur die als "heet" geldt | `60` |
| `reverse_flow` | Draait de stroomanimatie in de spiraal en de luchtpijlen om | `false` |
| `image` | Optioneel: eigen afbeelding van de doorsnede in plaats van de tekening, zie hieronder | leeg |

### Entiteiten

| Sleutel | Betekenis |
| --- | --- |
| `water_heater` | `water_heater`-entiteit (bijv. via Overkiz/Cozytouch). Wordt gebruikt voor temperatuur, instelwaarde en modus als de losse sensoren ontbreken |
| `tank_temp` | Watertemperatuur in het midden van de tank |
| `tank_top` / `tank_bottom` | Boven- en onderkant van de tank, als je die sensoren hebt |
| `setpoint` | Gewenste temperatuur |
| `air_in` / `air_out` | Luchttemperatuur voor en na de verdamper |
| `coil` / `exhaust` / `return_gas` | Verdamper-, persgas- en zuiggastemperatuur |
| `eev` | Positie expansieventiel |
| `power` | Elektrisch vermogen (W) |
| `energy_today` / `energy_month` / `energy_total` | Verbruik vandaag / deze maand / totaal (kWh) |
| `cop` | COP van de laatste cyclus |
| `available_liters` | Beschikbaar warm water (L) |
| `remaining_minutes` | Resterende tijd warm water (min) |
| `runtime_defrost` | Looptijd tot de volgende ontdooiing (min) |
| `pv_boost` | Schakelaar voor boost op zonne-energie |
| `compressor` | Warmtepomp actief aan/uit. Zonder deze sensor wordt "actief" afgeleid uit het vermogen (> 50 W) |
| `heater` | Elektrisch element aan/uit |
| `defrost` / `online` / `fault` | Ontdooien, online-status en storing |
| `away` | Afwezigheidsstand |
| `mode` | Modus (Eco+, Handmatig, Programma) |

---

## Eigen foto gebruiken

Standaard tekent de kaart de boiler zelf. Wil je liever een foto van de doorsnede, zet dan je eigen afbeelding in `/config/www/` en verwijs ernaar:

```yaml
type: custom:atlantic-explorer-card
image: /local/atlantic-explorer.webp
```

De animaties (spiraal, ventilator, element) en de kleur van het water worden over de foto heen getekend. Daarvoor moet de afbeelding aan drie eisen voldoen:

- de **doorsnede-foto van de Explorer V5** (module met ventilator bovenin, tank met spiraal eronder),
- een **transparante achtergrond** (PNG of WebP),
- een **verhouding van 1036 × 2500** (elke schaal mag, zolang de verhouding klopt).

De productfoto's zijn eigendom van Atlantic. Neem ze daarom niet op in een publieke repository.

---

## Goed om te weten

- De stroomrichting in de spiraal loopt van boven naar beneden: het hete gas komt bovenin binnen en gaat onderin naar het expansieventiel. Staat de richting bij jou omgekeerd, zet dan `reverse_flow: true`.
- De status "compressor actief" wordt afgeleid uit het vermogen als je geen `compressor`-sensor opgeeft.
- Een entiteit die niet bestaat, wordt stilletjes overgeslagen. Controleer bij een lege waarde of de entiteit-ID klopt.

## Licentie

MIT
