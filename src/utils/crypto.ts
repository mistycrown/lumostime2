/**
 * 计算字符串的 SHA-256 哈希值
 * @param input - 输入字符串
 * @returns Promise<string> - 64 位十六进制哈希字符串
 */
export async function sha256(input: string): Promise<string> {
  // 将字符串转换为 UTF-8 字节数组
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  
  // 使用 Web Crypto API 计算 SHA-256 哈希
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // 将 ArrayBuffer 转换为十六进制字符串
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  
  return hashHex;
}
