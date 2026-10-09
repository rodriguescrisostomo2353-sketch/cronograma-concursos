---
description: Regra permanente para envio automático de alterações via Git
trigger: sempre que terminar uma alteração no projeto ou quando o usuário pedir 'enviar', 'publicar' ou 'git push'
---

# Regra Permanente de Envio Automático (Git Push)

Sempre que eu terminar uma alteração no projeto, ou quando eu pedir "enviar", "publicar" ou "git push", execute pelo PowerShell:

1. `git status` (para conferir o que mudou)
2. `git add .`
3. `git commit -m "mensagem curta descrevendo o que foi alterado"`
4. `git push`

Se algo falhar, me explique o erro em linguagem simples e proponha a correção.

## Diretrizes de Segurança
- NUNCA commitar ou enviar chaves keystore (*.keystore, *.jks), senhas, tokens, arquivos .env, node_modules ou pastas de build/apk.
- Respeitar estritamente o arquivo `.gitignore`.
- Nunca utilizar `git push --force` sem permissão explícita.
