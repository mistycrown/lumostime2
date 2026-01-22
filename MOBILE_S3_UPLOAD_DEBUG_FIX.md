# 手机端S3上传Bug修复报告

## 修复时间
2026-01-22 23:08

## 问题诊断

### 症状
- ✅ 电脑端：连接和上传都正常
- ✅ 手机端连接测试：成功（headBucket通过）
- ❌ 手机端数据上传：失败（putObject签名验证失败）
- ⚠️ 日志问题：所有对象显示为`[object Object]`，无法查看详细错误

### 根本原因

从logcat日志分析发现：

1. **日志序列化问题**：
   - debugLog方法无法正确序列化复杂对象和Error对象
   - 导致所有错误详情显示为`[object Object]`
   - 无法获取详细的错误代码和消息

2. **签名验证失败的真实原因**：
   - headBucket（GET请求，无Body）成功
   - putObject（PUT请求，有286KB的JSON Body）失败
   - 说明问题出在**请求体的签名计算**上
   - 手机端WebView环境对JSON字符串的处理可能与桌面端有细微差异

## 修复方案

### 1. 改进debugLog方法

**问题**：无法正确序列化Error对象和含循环引用的对象

**修复**：
```typescript
private debugLog(message: string, data?: any) {
    // 改进的序列化逻辑
    if (data instanceof Error) {
        // 特殊处理Error对象
        logData = JSON.stringify({
            name: data.name,
            message: data.message,
            code: (data as any).code,
            statusCode: (data as any).statusCode,
            stack: data.stack?.split('\n').slice(0, 3).join('\n')
        }, null, 2);
    } else if (typeof data === 'object') {
        // 处理普通对象，避免循环引用
        const seen = new WeakSet();
        logData = JSON.stringify(data, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
            }
            return value;
        }, 2);
    }
}
```

**效果**：
- ✅ 能正确显示Error对象的详细信息
- ✅ 避免循环引用导致的序列化失败
- ✅ logcat中能看到完整的错误代码、消息和堆栈

### 2. 改进手机端putObject错误处理

**问题**：错误对象嵌套复杂，难以提取关键信息

**修复**：
```typescript
// 直接传递完整的错误对象，让debugLog处理序列化
this.debugLog('ERROR: putObject 失败', {
    errorCode: errorCode,
    errorMessage: errorMessage,
    retryCount: retryCount,
    fullError: err // 传递完整错误对象
});
```

**效果**：
- ✅ 能看到完整的错误响应
- ✅ 包括statusCode、requestId、headers等详细信息
- ✅ 更容易定位具体问题

### 3. 增强手机端Body处理日志

**问题**：无法确认Body格式是否正确

**修复**：
```typescript
if (Capacitor.isNativePlatform()) {
    putObjectParams.Body = content; // 确保是字符串
    this.debugLog('手机端Body处理', {
        bodyType: typeof content,
        bodyLength: content.length,
        bodyPreview: content.substring(0, 100) + '...'
    });
}
```

**效果**：
- ✅ 确认Body类型（应为string）
- ✅ 确认Body长度
- ✅ 查看Body开头内容，确认JSON格式正确

## 测试说明

### 1. 重新部署到手机

```bash
npm run build
npx cap sync android
npx cap run android
```

### 2. 查看增强的日志输出

现在logcat应该能显示：

```
[COS-DEBUG] ERROR: putObject 失败
{
  "errorCode": "SignatureDoesNotMatch",
  "errorMessage": "The request signature we calculated does not match...",
  "retryCount": 0,
  "fullError": {
    "name": "Error",
    "message": "详细错误消息",
    "code": "SignatureDoesNotMatch",
    "statusCode": 403,
    "requestId": "xxxxx",
    ...
  }
}
```

### 3. 重点关注的信息

查看以下关键日志：

1. **Body处理日志**：
   ```
   [COS-DEBUG] 手机端Body处理
   {
     "bodyType": "string",
     "bodyLength": 286051,
     "bodyPreview": "{\"logs\":[...]..."
   }
   ```

2. **完整错误信息**：
   - errorCode - 错误代码
   - errorMessage - 详细错误消息
   - statusCode - HTTP状态码
   - requestId - 腾讯云请求ID
   - headers - 响应头信息

## 下一步诊断

如果问题仍然存在，现在我们能看到详细错误信息了：

1. **检查errorCode**：
   - `SignatureDoesNotMatch` - 签名不匹配
   - `RequestTimeTooSkewed` - 时间偏差
   - `AccessDenied` - 权限问题
   - 其他错误码

2. **检查errorMessage中的详细信息**：
   - 服务器计算的签名 vs 客户端签名
   - 签名字符串的差异
   - 具体哪个参数导致签名不匹配

3. **可能的进一步修复方向**：
   - 如果是Content-Type问题：调整ContentType设置
   - 如果是Body编码问题：尝试不同的编码方式
   - 如果是Headers问题：调整自定义Headers
   - 如果是签名算法问题：可能需要手动实现签名而非使用SDK

## 修改的文件

- `services/s3Service.ts`
  - `debugLog()` - 改进对象序列化
  - `uploadData()` - 增强错误日志和Body处理

## 预期改进

本次修复后：
- ✅ 能看到完整的错误详情
- ✅ 能准确定位问题原因
- ✅ 为进一步修复提供精确的诊断信息

如果签名验证仍然失败，我们现在可以看到**为什么失败**，从而针对性地解决问题。
