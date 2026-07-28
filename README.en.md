# LaneMapLeader

[简体中文](README.md) · [繁體中文](README.zh-Hant.md) · **English**

---

LaneMapLeader is a browser-based navigation application integrating route planning, GPS navigation, device orientation sensing, road matching, lane guidance, and the LaneGo road data editing tool.

## Features

- Search for locations via Nominatim, or set origin and destination directly on the map.
- Compute multiple real road routes via OSRM — routes are not drawn as straight lines between points.
- Support route preferences: balanced, fastest on complex roads, fewer turns, and shorter distance.
- Provide conservative travel time estimates based on intersection density and turn complexity.
- Follow the current position and heading using GPS and device orientation sensors.
- Display Traditional Chinese turn-by-turn navigation, remaining distance, remaining time, and arrival status.
- Match local roads and show forward or reverse lane guidance for the current road.
- Provide a desktop-only road and lane editor.
- Supply CLI tools for OSM PBF conversion, road database construction, and manual corrections.

## Tech Stack

- React 18, TypeScript, Vite
- MapLibre GL, react-map-gl, OpenFreeMap
- Tailwind CSS
- OSRM, Nominatim, OpenStreetMap
- Vitest, ESLint

## Local Development

Node.js 20 is recommended.

```bash
npm install
npm run dev
```

Open the local address printed by Vite. The application reads:

```text
public/data/macau/roads.json
```

Desktop road editor URL in development:

```text
http://localhost:5173/editor.html
```

GPS and device orientation require `localhost` or HTTPS, and browser permissions.

## Project Checks

```bash
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
```

## Road Data Tools

Query road data (Macau example):

```bash
npm run roads:edit -- info
npm run roads:edit -- search 大學
```

Apply manual lane corrections:

```bash
npm run roads:apply
```

Rebuild the road database from existing OSM JSON:

```bash
npm run roads:build
```

This command requires `public/data/<city>/osm_fr.json`.

Run the full data pipeline from an OSM PBF file (Macau example):

```bash
npm run roads:pipeline -- path/to/macau.osm.pbf macau --keep-json
```

Without `--keep-json`, the pipeline deletes intermediate JSON files after building.

## Deployment

The project includes a GitHub Pages workflow that automatically installs, builds, checks, and deploys on pushes to the `main` branch.

The default Vite base path is:

```text
/LaneMapLeader/
```

Repository: <https://github.com/wangsan71/LaneMapLeader>

Expected deployment URL:

```text
https://wangsan71.github.io/LaneMapLeader/
```

If deploying to a different repository name or path, update `base` in `vite.config.ts` accordingly.

## External Services

The application depends on OpenFreeMap, Nominatim, and public OSRM services, requires an internet connection, and may be affected by service rate limits or availability. The current "complex road time estimation" is calculated from route distance, intersections, and turn complexity and does not represent real-time traffic data.

Map, search, routing services, and OpenStreetMap road data are governed by their respective terms of service and data licenses.

## License

Application source code is licensed under the [MIT License](LICENSE).
