# LED 灯珠字幕

把 KIGTTS 的字幕变成一块温暖发光的灯板。手动输入、选择快捷短语或开启聆听，灯珠都会跟随文字更新。

点击“开启聆听”左侧的灯泡切换显示方式。短句自动适应字幕区域，长文缓慢滚动；关闭灯泡即可恢复普通字幕。点按编辑、长按全屏和双指调整字号仍使用主界面的操作。

显示只在本次会话启用，重启软件后恢复普通字幕。图像、网页等媒体快捷文本继续使用原有显示方式。

## 构建

需要 JDK 17、Android SDK 36、PowerShell 7。SDK 通过子模块固定，首先运行 `git submodule update --init --recursive`。

```powershell
./gradlew.bat testDebugUnitTest assembleDebug collectPluginDependencies
node --test tests/layout.test.cjs
./Package.ps1 -SigningKey /path/to/private.der -AndroidSdk /path/to/android-sdk -SkipBuild
```

`display.led` 需要宿主插件 API17。本地 HTML/Canvas 使用独立文字布局模块，灯珠亮芯、光晕和暗珠均由代码绘制，无需网络、字体下载或图片素材。字号使用宿主传入的 CJK 字宽百分比。画布密度上限 1.5，长文按缓存面积分页，静态字幕不持续刷新；启用系统“减弱动态”时改为分段停留阅读。

## 验证

JVM 测试覆盖资源交付、开关位置、会话恢复和宿主选择状态。Node 测试覆盖 Unicode 字素、横竖屏排版、英文单词换行与长文缓存上限。

浏览器验收脚本位于 `tests/browser-check.js`。先在 `src/main/assets/led` 启动本地 HTTP 服务（端口 8768），再通过 Playwright CLI 的独立会话执行：

```powershell
npx --yes --package @playwright/cli playwright-cli -s=led-caption open http://127.0.0.1:8768/index.html
npx --yes --package @playwright/cli playwright-cli -s=led-caption run-code --filename tests/browser-check.js
```

截图存入 `output/playwright/`。该检查验证实际前景像素、旋转后显示、长文滚动、流式合并、暂停恢复、高 DPI、占位文本与减弱动态。

MIT License。
