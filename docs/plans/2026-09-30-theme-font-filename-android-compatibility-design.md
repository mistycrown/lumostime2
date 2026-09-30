# 主题字体文件名 Android 兼容设计

日期：2026-09-30

## 已确认的问题

手机日志引用的 `index-DHzyl5Rz.js` 已包含 data URL 字体注册回退，说明此前的
`FontFace` 修复已部署但尚未执行到。主题导入仍报 `e.split is not a function`，而
编译产物中与主题字体路径匹配的调用是 `detectFontFormat(file.name)`，其内部直接调用
`fileName.split('.')`。

导入服务当前通过 `new File([fontBlob], filename)` 人工包装 ZIP 解出的 Blob。部分
Android WebView 对这个合成 File 的 `name` 属性不保证是字符串，导致在格式判断时
抛错，早于字体二进制的加载与注册。

## 方案选择

可选方案包括：继续把合成 File 的 `name` 强制转字符串；彻底取消合成 File、传递
Blob 和经 ZIP 清单验证的文件名；或删除主题字体。选择第二种：它不依赖 Android
WebView 的 File 构造兼容性，且保留兔子云朵主题的字体。

## 设计

`fontService.addCustomFont` 改为接收 `Blob | File` 与可选的显式 `fileName`。服务先
选用该显式名称；缺失时仅在 `blob.name` 为字符串且非空时使用它；其余情况返回受控的
不支持格式结果，绝不对未知值调用字符串方法。持久化记录写入同一解析后的文件名。

主题导入服务不再构造 `File`。它将 ZIP 解出的原始 Blob、`fontConfig.displayName` 和
`getFilename(fontConfig.file)` 传给字体服务。该路径已由主题包解析器校验为存在于
`assets/` 下的受支持字体资源。

## 验证

- 普通文件上传仍从真实 File 名推断格式。
- Blob 配合显式 `.ttf` 文件名可成功导入，无需 `File` 构造。
- 模拟非字符串 `File.name` 时不会产生 `.split` 异常；无显式名称则受控失败。
- 主题导入以 Blob 和 ZIP 路径名调用字体服务；字体失败仍回滚已保存资源。

## 非目标

- 不移除兔子云朵字体，不改变字体大小和格式限制。
- 不依赖 Android 版本或 User-Agent 判断。
- 不取消此前保留的 `FontFace` data URL 回退。
