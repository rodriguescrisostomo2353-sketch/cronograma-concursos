# 🔄 Regra Permanente de Envio Automático (Git Push)

Esta regra está gravada no projeto e deve ser seguida pelo assistente de IA sempre que uma alteração for concluída ou a pedido do usuário:

> **"Sempre que eu terminar uma alteração no projeto, ou quando eu pedir 'enviar', 'publicar' ou 'git push', execute pelo PowerShell:**
> 1. `git status` (para conferir o que mudou)
> 2. `git add .`
> 3. `git commit -m "mensagem curta descrevendo o que foi alterado"`
> 4. `git push`
> **Se algo falhar, me explique o erro em linguagem simples e proponha a correção."**

---

## 🔒 Diretrizes de Segurança (Obrigatórias)

1. **Nunca enviar arquivos sensíveis:**
   - Chaves de assinatura do APK (`*.keystore`, `*.jks`, `*.p12`, `*.key`)
   - Senhas, tokens e credenciais
   - Arquivos de ambiente (`.env`, `.env.*`)
   - Dependências (`node_modules/`)
   - Arquivos de build (`*.apk`, `*.aab`, pastas `build/`, `.gradle/`)
2. **Autenticação:**
   - Nunca gravar tokens ou senhas no código. Usar o Git Credential Manager nativo do sistema.
3. **Integridade do Repositório:**
   - Nunca utilizar `git push --force` sem autorização expressa.
