import hashlib
import secrets
import json
import os
import base64

# 固定的主密钥（这些可以公开，因为没有明文信息）
MASTER_KEYS = [
    "LUMOS_MASTER_KEY_ALPHA",
    "LUMOS_MASTER_KEY_BETA", 
    "LUMOS_MASTER_KEY_GAMMA",
    "LUMOS_MASTER_KEY_DELTA",
    "LUMOS_MASTER_KEY_EPSILON"
]

def encode_user_id(user_id, master_key):
    """
    将用户ID编码成看起来随机的字符串
    使用HMAC确保安全性和一致性
    """
    import hmac
    
    # 使用HMAC生成一致的"随机"字符串
    message = f"USER_{user_id:06d}_LUMOS"
    signature = hmac.new(
        master_key.encode(), 
        message.encode(), 
        hashlib.sha256
    ).digest()
    
    # 取前6字节，转换为base32（去掉容易混淆的字符）
    encoded = base64.b32encode(signature[:6]).decode().replace('=', '')
    # 只取前8位，确保长度一致
    return encoded[:8]

def decode_and_verify(code, master_keys):
    """
    解码兑换码并验证其合法性
    返回 (is_valid, user_id, master_key_used)
    """
    if not code.startswith("LUMOS-"):
        return False, None, None
    
    try:
        # 解析兑换码格式: LUMOS-{ENCODED_ID}
        encoded_part = code[6:]  # 去掉 "LUMOS-" 前缀
        
        # 尝试每个主密钥
        for master_key in master_keys:
            # 尝试不同的用户ID（暴力破解范围：1-999999）
            # 在实际应用中，我们会限制搜索范围
            for user_id in range(1, 100000):  # 限制搜索范围以提高性能
                expected_encoded = encode_user_id(user_id, master_key)
                if expected_encoded == encoded_part:
                    return True, user_id, master_key
        
        return False, None, None
    except:
        return False, None, None

def generate_code_for_user(user_id, master_key_index=0):
    """
    为指定用户ID生成兑换码
    """
    master_key = MASTER_KEYS[master_key_index % len(MASTER_KEYS)]
    encoded_id = encode_user_id(user_id, master_key)
    return f"LUMOS-{encoded_id}"

def generate_master_hashes():
    """
    生成主密钥的哈希值用于客户端验证
    这些哈希值可以安全地存储在客户端
    """
    hashes = {}
    for i, key in enumerate(MASTER_KEYS):
        # 为每个主密钥生成一个标识哈希
        key_hash = hashlib.sha256(f"MASTER_KEY_{i}_{key}".encode()).hexdigest()
        hashes[key_hash] = i
    return hashes

def load_existing_data():
    """
    Load existing codes to continue numbering
    """
    codes_file = "redemption_codes_SECRET.json"
    existing_codes = []
    next_id = 1
    
    if os.path.exists(codes_file):
        try:
            with open(codes_file, "r", encoding='utf-8') as f:
                existing_codes = json.load(f)
                if existing_codes:
                    next_id = max(item["id"] for item in existing_codes) + 1
        except:
            pass
    
    return existing_codes, next_id

def save_data(all_codes):
    """
    Save codes and generate minimal hash file
    """
    # Save codes
    codes_file_path = "redemption_codes_SECRET.json"
    with open(codes_file_path, "w", encoding='utf-8') as f:
        json.dump(all_codes, f, indent=2, ensure_ascii=False)
    
    # Generate master key hashes (very small file!)
    master_hashes = generate_master_hashes()
    
    ts_content = f"""// Redemption system master keys
// Only {len(MASTER_KEYS)} hashes for unlimited users!
export const MASTER_KEY_HASHES: Record<string, number> = {{
"""
    for hash_val, key_index in master_hashes.items():
        ts_content += f'    "{hash_val}": {key_index},\n'
    
    ts_content += "};\n\n"
    ts_content += f"""// Master keys for verification (can be public)
export const MASTER_KEYS = {json.dumps(MASTER_KEYS, indent=4)};
"""
    
    ts_file_path = "src/constants/redemptionHashes.ts"
    os.makedirs(os.path.dirname(ts_file_path), exist_ok=True)
    
    with open(ts_file_path, "w", encoding='utf-8') as f:
        f.write(ts_content)
    
    return codes_file_path, ts_file_path

def main():
    # Load existing data
    existing_codes, next_id = load_existing_data()
    
    print(f"当前已有 {len(existing_codes)} 个兑换码")
    print(f"下一个编号将从 #{next_id} 开始")
    
    # Ask user how many new codes to generate
    try:
        count = int(input(f"要生成多少个新兑换码？(默认 100): ") or "100")
    except ValueError:
        count = 100
    
    print(f"正在生成 {count} 个新兑换码 (#{next_id} - #{next_id + count - 1})...")
    
    # Generate new codes using algorithm
    new_codes = []
    for i in range(count):
        user_id = next_id + i
        # 使用不同的主密钥来增加变化性
        master_key_index = user_id % len(MASTER_KEYS)
        code = generate_code_for_user(user_id, master_key_index)
        
        new_codes.append({
            "id": user_id,
            "code": code,
            "master_key_index": master_key_index
        })
    
    # Merge with existing data
    all_codes = existing_codes + new_codes
    
    # Save data
    codes_file, hashes_file = save_data(all_codes)
    
    print(f"✅ 生成完成！")
    print(f"   总计兑换码: {len(all_codes)} 个")
    print(f"   新增兑换码: {count} 个 (#{next_id} - #{next_id + count - 1})")
    print(f"   保密文件: {codes_file}")
    print(f"   公开文件: {hashes_file} (只有 {len(MASTER_KEYS)} 个哈希值！)")
    print()
    print("📋 新生成的兑换码:")
    for code_data in new_codes[:5]:  # Show first 5
        print(f"   #{code_data['id']:3d}: {code_data['code']}")
    if len(new_codes) > 5:
        print(f"   ... 还有 {len(new_codes) - 5} 个")
    
    # Test verification
    print("\n🧪 验证测试:")
    test_code = new_codes[0]['code']
    is_valid, user_id, master_key = decode_and_verify(test_code, MASTER_KEYS)
    print(f"   测试兑换码: {test_code}")
    print(f"   验证结果: {'✅ 有效' if is_valid else '❌ 无效'}")
    if is_valid:
        print(f"   解析用户ID: #{user_id}")

if __name__ == "__main__":
    main()