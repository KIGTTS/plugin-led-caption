# LED 灯珠字幕

把 KIGTTS 的字幕变成一块温暖发光的灯板。手动输入、选择快捷短语或开启聆听，灯珠都会跟随文字更新。

点击“开启聆听”左侧的灯泡切换显示方式。短句自动适应字幕区域，长文缓慢滚动；关闭灯泡即可恢复普通字幕。点按编辑、长按全屏和双指调整字号仍使用主界面的操作。

开启灯板后，点按字号左侧的调整按钮，即可设置颜色、灯珠、字号和滚动方式。字号可调到300%，显示高度可铺满；横屏也能显示大字。下次开启会保留你的样式。朗读按钮左侧可切换全屏。

- 外观：字幕色、背景色、点阵/普通字体、圆/方灯珠、密度、尺寸、辉光、显示高度。
- 排版：自动换行、滚动速度与方向、循环间距、文本对齐、左滑快捷文本开关。
- 屏幕：保持常亮、跟随系统亮度、手动亮度。

灯板在本次会话生效。打开时首页切换纯黑暗色、遮罩到 100%，并收起快捷文本。退出灯板或离开首页时恢复页面外观。样式继续保存，图像、网页等媒体仍按原方式显示。

## 构建

需要 JDK 17、Android SDK 36、PowerShell 7。SDK 通过子模块固定，首先运行 `git submodule update --init --recursive`。

```powershell
./gradlew.bat testDebugUnitTest assembleDebug collectPluginDependencies
node --test tests/layout.test.cjs tests/style.test.cjs
./Package.ps1 -SigningKey /path/to/private.der -AndroidSdk /path/to/android-sdk -SkipBuild
```

`display.led` 0.1.15 需要宿主插件 API38。样式通过 `SetNativeSubtitleRenderer` 交给宿主的 Canvas 绘制。滚动只改变固定灯珠的亮度，双指缩放松手时保存字号。启用 LED 时，主界面顶栏和快捷文本底栏会在闲置后淡化，触摸恢复。展开快捷文本或编辑时保持全亮。减少动效时定时分段显示。有效显示区域默认设为 16 行。双指缩放使用主字幕字号，左右拖动可以调整滚动进度。设置弹窗内滑条显示当前数值，松手后更新灯板。

## 验证

JVM 测试覆盖原生声明、开关位置、样式保存、旧预设迁移和宿主选择状态。旧 WebView 渲染器保留在 `tests/legacy-renderer` 作离线对照。Node 测试仍可验证旧版的 Unicode、排版和缓存预算。生产插件包只携带原生声明和配置所需资源。

MIT License。
