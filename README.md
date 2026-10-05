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

作品数据位于 `src/works.json`，时期分组位于 `src/App.jsx`。宣传素材来源见 [ASSET_SOURCES.md](ASSET_SOURCES.md)，图像版权归原权利人。

此版本保留 40% 视窗位置触发 Focus、年份缩放过渡及原滚动缓动，为后续迭代的基线。

## 独立 CMS

打开 `/admin`，首次在本机设置至少10位的管理员密码。支持作品新增、编辑、封面上传、草稿、发布、撤下、回收站恢复与修改记录。前台没有管理入口。

数据保存在 `.cms/content.json`，管理员密码哈希保存在 `.cms/auth.json`，上传图片在 `public/uploads/`。请同时备份 `.cms/` 和上传目录。服务重启后需重新登录，内容不会丢失。不要删除这两个目录。

生产构建可在本机通过 `npm run build` 后 `npm start` 运行。此版本仅监听本机，尚未部署公网；公开部署需HTTPS反向代理与持久化磁盘。原静态Sites打包脚本保留，但单独部署静态产物无法使用此CMS接口。

`npm run test:cms` 验证权限、草稿发布隔离、回收站、冲突和持久化。
