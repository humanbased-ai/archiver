#!/bin/bash
# 安全检查脚本

echo "======================================================================="
echo "🔒 AI Content Studio 安全检查"
echo "======================================================================="
echo ""

# 1. 检查依赖漏洞
echo "1️⃣  检查依赖安全漏洞..."
pip install -q pip-audit 2>/dev/null
if command -v pip-audit &> /dev/null; then
    pip-audit || echo "⚠️  发现依赖漏洞，请查看上述报告"
else
    echo "⚠️  pip-audit 未安装，跳过依赖检查"
fi
echo ""

# 2. 代码安全扫描
echo "2️⃣  扫描代码安全问题..."
pip install -q bandit 2>/dev/null
if command -v bandit &> /dev/null; then
    bandit -r src/ skills/ -ll 2>/dev/null || echo "⚠️  发现安全问题"
else
    echo "⚠️  bandit 未安装，跳过代码扫描"
fi
echo ""

# 3. 检查硬编码密钥
echo "3️⃣  检查硬编码的 API keys..."
FOUND=0
for pattern in "sk-ant-api" "r8_[A-Za-z0-9]{20,}" "AAAAAAAAAA"; do
    if grep -r "$pattern" --include="*.py" src/ skills/ 2>/dev/null | grep -v ".env" | grep -v "your-key" | grep -v "example" | head -1; then
        FOUND=1
    fi
done

if [ $FOUND -eq 0 ]; then
    echo "✅ 未发现硬编码的 API keys"
else
    echo "❌ 发现硬编码的 API keys！请立即修复"
fi
echo ""

# 4. 检查 .env 文件
echo "4️⃣  检查敏感文件保护..."
if grep -q "^.env$" .gitignore && grep -q "^config/.env$" .gitignore; then
    echo "✅ .env 文件已在 .gitignore 中"
else
    echo "❌ .env 文件未正确加入 .gitignore"
fi
echo ""

# 5. 检查文件权限
echo "5️⃣  检查敏感文件权限..."
for file in config/.env .env; do
    if [ -f "$file" ]; then
        PERMS=$(stat -f "%A" "$file" 2>/dev/null || stat -c "%a" "$file" 2>/dev/null)
        if [ "$PERMS" = "600" ] || [ "$PERMS" = "400" ]; then
            echo "✅ $file 权限安全 ($PERMS)"
        else
            echo "⚠️  $file 权限过于宽松 ($PERMS)，建议 chmod 600"
        fi
    fi
done
echo ""

echo "======================================================================="
echo "📊 安全检查完成"
echo "======================================================================="
echo ""
echo "💡 建议："
echo "   - 定期运行此脚本（每周）"
echo "   - 在部署前必须运行"
echo "   - 修复所有 ❌ 标记的问题"
echo ""
