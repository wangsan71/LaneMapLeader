# LaneMapLeader

**简体中文** · [繁體中文](README.zh-Hant.md) · [English](README.en.md)

---

LaneMapLeader 是面向道路的浏览器导航应用，整合路线规划、GPS 导航、设备方向感应、道路匹配、车道指引，以及 LaneGo 道路数据编辑工具。

## 功能

- 使用 Nominatim 搜索地点，或直接在地图上设置起点和终点。
- 使用 OSRM 规划多条实际道路路线，不以起终点直线作为导航路线。
- 支持平衡推荐、复杂路况下最快、较少转弯和较短距离等路线偏好。
- 根据路口密度和转弯复杂度提供较保守的预计行车时间。
- 使用 GPS 和设备方向感应跟随当前位置及行驶方向。
- 显示繁体中文逐向导航、剩余距离、剩余时间和到达状态。
- 匹配本地道路，显示当前道路的顺向或反向车道指引。
- 提供仅供桌面使用的道路及车道编辑器。
- 提供 OSM PBF 转换、道路数据库构建及人工修正 CLI 工具。

## 技术栈

- React 18、TypeScript、Vite
- MapLibre GL、react-map-gl、OpenFreeMap
- Tailwind CSS
- OSRM、Nominatim、OpenStreetMap
- Vitest、ESLint

## 本地开发

建议使用 Node.js 20。

```bash
npm install
npm run dev
```

打开 Vite 输出的本地地址。应用会读取：

```text
public/data/macau/roads.json
```

开发环境下的桌面道路编辑器地址：

```text
http://localhost:5173/editor.html
```

GPS 和设备方向功能需要 `localhost` 或 HTTPS，并需要浏览器授权。

## 项目检查

```bash
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
```

## 道路数据工具

查询道路数据（以澳门为例）：

```bash
npm run roads:edit -- info
npm run roads:edit -- search 大學
```

应用人工车道修正：

```bash
npm run roads:apply
```

从现有 OSM JSON 重新构建道路数据库：

```bash
npm run roads:build
```

该命令需要 `public/data/<city>/osm_fr.json`。

从 OSM PBF 执行完整数据管线（以澳门为例）：

```bash
npm run roads:pipeline -- path/to/macau.osm.pbf macau --keep-json
```

不传入 `--keep-json` 时，管线会在构建完成后删除中间 JSON 文件。

## 部署

项目包含 GitHub Pages 工作流，推送到 `main` 分支后会自动执行安装、构建、检查和部署。

默认 Vite 基础路径是：

```text
/LaneMapLeader/
```

对应仓库：<https://github.com/wangsan71/LaneMapLeader>

部署完成后的预期地址：

```text
https://wangsan71.github.io/LaneMapLeader/
```

若部署到其他仓库名或路径，需要同步修改 `vite.config.ts` 中的 `base`。

## 外部服务说明

应用依赖 OpenFreeMap、Nominatim 和公共 OSRM 服务，需要互联网连接，并可能受服务限流或可用性影响。当前“复杂路况估时”基于路线距离、路口和转弯复杂度计算，不代表实时交通数据。

地图、搜索、路线服务及 OpenStreetMap 道路数据分别受其服务条款和数据许可证约束。

## License

应用源码使用 [MIT License](LICENSE)。
