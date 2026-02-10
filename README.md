# 二次元图片下载器 (Rust + Tauri + Leptos)

这是我最早的一个开源项目，现已迁移到 Rust + Tauri + Leptos，全量用 Rust 管理核心逻辑与 UI。

---

一个专注于二次元图片的现代化下载浏览器。

## 🌟 特色功能

- 📸 多种二次元图片分类
  - 精选图像
  - 随机无色图像
  - 银发
  - 兽耳
  - 星空
  - 竖屏/横屏
- 🎨 现代化图片浏览
  - 大图预览
  - 上下文信息提示
  - 快速切图
- 💾 便捷的保存功能
  - 一键保存
  - 批量下载
  - 智能文件名生成

## 🧱 技术栈

- Rust (核心逻辑与数据处理)
- Tauri (桌面应用壳)
- Leptos + Trunk (Rust 前端)
- Nix flake (开发环境)

## 🖼️ 数据来源

本程序的图片数据由 [cnmiw.com](https://cnmiw.com) 提供支持。

## ✅ 本地开发

推荐使用 Nix 开发环境。

```bash
direnv allow
npm install
npm run tauri dev
```

如果不使用 Nix，手动安装：

- Rust + `wasm32-unknown-unknown`
- `trunk`
- GTK/WebKit/GLib 依赖 (Linux)

## 📦 打包发行

```bash
npm run tauri build
```

产物在 `src-tauri/target/release/bundle/`。

## 🚀 发布新版本 (GitHub Actions)

1. 更新版本号（建议在 `src-tauri/tauri.conf.json` 和 `package.json` 保持一致）。
2. 提交并推送代码
3. 创建并推送标签：

```bash
git tag -a vX.X.X -m "版本说明"
git push origin vX.X.X
```

4. 等待 GitHub Actions 构建并发布
