#!/bin/bash

echo "🔍 Verificando status do repositório..."
cd /Users/ramon/.gemini/antigravity/scratch/frontend-owner

# Verificar se not-found.tsx existe e removê-lo
if [ -f "app/not-found.tsx" ]; then
    echo "🗑️  Removendo app/not-found.tsx..."
    git rm app/not-found.tsx
fi

echo ""
echo "📦 Arquivos modificados:"
git status --short

echo ""
echo "➕ Adicionando todas as mudanças..."
git add .

echo ""
echo "💾 Criando commit..."
git commit -m "Fix: Resolve Vercel build errors

- Updated MaskedInput component to accept all standard input props
- Added User and UserRole type definitions to frontend
- Removed id attributes from MaskedInput usages
- Added Landing Page with 7-day trial signup
- Created trial_subscriptions table migration
- Implemented signup API with tenant and trial creation"

echo ""
echo "🚀 Enviando para o repositório remoto..."
git push

echo ""
echo "✅ Deploy concluído! Aguarde o build do Vercel finalizar."
