# firefox-youtube-url

一个 Firefox 扩展：**扫描当前页面源码中的各种 YouTube URL 变体**，并在弹窗里以「显示名称（蓝色可点击）」+「URL 代码块」+「复制按钮」的形式列出。

## 功能

- **扫描范围**：
  - 页面中所有 `<a href>`（能拿到类似“蓝色文字”的显示名称）
  - 页面 `outerHTML`（能抓到脚本/数据里出现的 YouTube URL，包括常见的 `https:\/\/...`、`\u0026` 等转义）
- **支持的 URL 族**（示例）：
  - `https://www.youtube.com/watch?v=...`
  - `https://youtu.be/...`
  - `https://m.youtube.com/...`
  - `https://music.youtube.com/...`
  - `https://www.youtube.com/shorts/...`
  - `https://www.youtube.com/embed/...`
  - `https://www.youtube.com/live/...`
- **一键复制**：
  - 每条 URL 右侧「复制」
  - 「复制全部」（用换行分隔）

## 安装（临时加载，适合开发/自用）

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击「**临时载入附加组件…**」
3. 选择本项目根目录下的 `manifest.json`
4. 打开任意普通网页（`http/https`），点击工具栏里的扩展图标即可看到结果

> 注意：Firefox 出于安全限制，`about:`、`moz-extension:`、部分 `file:` 页面可能无法被扩展访问，弹窗会提示不可用。

## 自动打包并上传到 GitHub Release（GitHub Actions）

本仓库已内置 Action：当你推送形如 `v1.2.3` 的 tag 时，会自动构建 Firefox 扩展包并上传到对应 Release。

### 产物是什么？

- **XPI**：Firefox 扩展包，文件扩展名是 `.xpi`（本质就是 zip）
- Action 会在 Release 里上传：
  - `dist/*.zip`
  - `dist/*.xpi`（由 zip 复制一份改名，便于直观使用）

### 如何发布

在本地执行：

```bash
git tag v1.0.1
git push origin v1.0.1
```

推送成功后，到 GitHub 的 **Actions** 看构建日志；构建完成会自动生成/更新同名 **Release** 并把包上传上去。

### （可选）自动签名 XPI（用于“可安装”的发布）

Firefox 若要在用户环境里直接安装/分发，通常需要 **AMO 签名**。本 Action 已预留签名步骤：只要你在仓库 Secrets 配好以下两项，就会自动多产出一个“已签名”的包：

- `AMO_JWT_ISSUER`
- `AMO_JWT_SECRET`

> 提示：签名需要 `manifest.json` 里存在 `browser_specific_settings.gecko.id`（本项目已设置为 `youtube-url-finder@local`；你也可以改成你自己的域名式 ID）。
