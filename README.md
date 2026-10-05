# ANITIME 番年史

基于真实历史背景的日本动画时间线原型，支持日本与欧洲轨道、Timeline / Overview 收拢展开、年份聚焦、作品详情和官方宣传图。

## 本地运行

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 4173
```

## 构建与检查

```sh
npm run build
npm run test:sites
```

技术栈：React 19、Vite 6、CSS。

作品数据与时期分组位于 `src/catalog.json`。宣传素材来源见 [ASSET_SOURCES.md](ASSET_SOURCES.md)，图像版权归原权利人。

此版本保留 40% 视窗位置触发 Focus、年份缩放过渡及原滚动缓动，为后续迭代的基线。

## 前台独立版本

本仓库只包含对外时间线。作品由 `src/catalog.json` 的已发布快照提供，不需要CMS服务、管理账号或API。管理面板及未发布草稿不包含在此版本中。
