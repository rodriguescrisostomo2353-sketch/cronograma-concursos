# 🚀 Guia e Checklist: Como Lançar Atualizações do Aplicativo

Este guia contém o passo a passo completo e simplificado para você lançar novas versões do seu aplicativo tanto para a **Web / PWA** quanto para o **APK Android**.

---

## ⚠️ As Duas Regras de Ouro do Android (MUITO IMPORTANTE!)

Para que quem já instalou o app consiga instalar a nova versão **por cima** (sem precisar desinstalar e sem perder seus dados salvos):

1. **A MESMA Chave de Assinatura (Keystore):**  
   O novo APK **precisa obrigatoriamente** ser assinado com o mesmo arquivo de chave (`.jks` ou `.keystore`) e as mesmas senhas da versão anterior. Se você assinar com uma chave diferente, o Android exibirá o erro: *"O pacote já foi instalado com uma assinatura conflitante"* e bloqueará a instalação.
2. **`versionCode` SEMPRE Maior:**  
   No arquivo `android/app/build.gradle`, o número `versionCode` precisa ser aumentado (exemplo: de `1` para `2`, depois `3`, etc.). O Android só aceita atualizar se o número for estritamente maior.

---

## 🔑 Como Criar e Guardar sua Chave de Assinatura (Keystore)

A Keystore é o seu "RG de desenvolvedor". Faça isso **uma única vez** e guarde com muito cuidado:

### Criando no Android Studio:
1. Abra o projeto no Android Studio (pode usar o atalho `abrir_android_studio.bat`).
2. No menu superior, clique em **Build** > **Generate Signed Bundle / APK...**.
3. Escolha **APK** e clique em **Next**.
4. Abaixo de *Key store path*, clique em **Create new...**.
5. Preencha os campos:
   - **Key store path:** Escolha uma pasta segura fora do projeto (ex.: `C:\MinhasChavesAndroid\cronograma-release.jks`).
   - **Password (Senha do Keystore):** Crie uma senha forte e anote.
   - **Alias:** Deixe `key0` ou coloque `cronograma`.
   - **Password (Senha do Alias):** Coloque a mesma senha ou outra forte e anote.
   - **Validity (years):** Deixe `25` anos.
   - **Certificate (First and Last Name):** Digite seu nome.
6. Clique em **OK** e conclua a geração.

### 🛡️ Onde GUARDAR a sua Chave:
- **Faça Backup:** Guarde uma cópia do arquivo `.jks` no seu Google Drive pessoal, pendrive ou cofre de senhas.
- **NUNCA suba a chave no GitHub público:** Ela deve ficar somente no seu computador local e no seu backup pessoal.
- **Se perder a chave:** Não será mais possível atualizar o app já instalado nos celulares; os usuários teriam que desinstalar a versão antiga para instalar a nova.

---

## ⚡ Método Rápido (Recomendado): Usando o Script Automático

Criamos um script que faz quase tudo sozinho em segundos!

1. Abra o PowerShell na pasta do projeto e execute:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\lancar_atualizacao.ps1
   ```
2. O script vai perguntar:
   - **Qual a nova versão?** (ex.: `1.1.0`)
   - **Quais as novidades?** (digite cada melhoria e aperte Enter)
   - **Qual o link de download do APK?** (pode manter o link do GitHub Releases)
3. O script atualiza automaticamente:
   - O `APP_VERSION` no código do `index.html`.
   - O `version.json` com data de hoje, novidades e histórico.
   - A versão do cache no `sw.js` (para o app atualizar no celular).
   - O `versionCode` (+1) e `versionName` no `build.gradle` do Android.
   - Copia tudo para as pastas do Android Studio (`www/` e `assets/`).

---

## 📝 Passo a Passo Manual (se preferir fazer à mão)

Caso queira fazer sem o script automático, siga este checklist:

### 1) Atualizar os arquivos do site
- Abra o `index.html` e altere a constante:
  ```javascript
  const APP_VERSION = "1.1.0"; // Sua nova versão
  ```
- Abra o `sw.js` e aumente o nome do cache:
  ```javascript
  const CACHE_NAME = 'cronograma-concursos-v3'; // Aumente o número da versão
  ```
- Abra o `version.json` e atualize:
  - `"version": "1.1.0"`
  - `"date": "AAAA-MM-DD"` (data do lançamento)
  - `"notes": ["Novidade 1", "Novidade 2"]`
  - Mova os dados da versão anterior para o array `"history"`.

### 2) Aumentar o `versionCode` no Android
- Abra o arquivo `android/app/build.gradle` e altere:
  ```groovy
  versionCode 2      // Sempre aumente +1 em relação ao anterior
  versionName "1.1.0" // Coloque o mesmo texto da versão
  ```

### 3) Sincronizar os arquivos para o Android
- No PowerShell, execute:
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\prepare_android.ps1
  ```

### 4) Gerar o novo APK assinado
- **Pelo Android Studio:**
  1. Abra o Android Studio (`abrir_android_studio.bat`).
  2. Menu **Build** > **Generate Signed Bundle / APK...** > **APK**.
  3. Selecione a sua Keystore existente, digite as senhas e clique em **Next**.
  4. Marque a variante **release** e clique em **Create**.
  5. Ao terminar, clique em **locate** para pegar o arquivo `app-release.apk`.
- **Ou pelo script automático de compilação:**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\sync_and_build_apk.ps1
  ```
  *(O arquivo atualizado ficará salvo na pasta `apk\CronogramaDeEstudos.apk`)*.

---

## 🌐 Como Hospedar o APK Gratuitamente no GitHub Releases

O GitHub Releases é a melhor forma gratuita de hospedar o APK com link direto e seguro (HTTPS):

1. Acesse o repositório do seu projeto no **GitHub**.
2. Na barra lateral direita, clique em **Releases** (ou no topo: *Create a new release*).
3. Clique no botão **Draft a new release**.
4. Em **Choose a tag**, digite a versão (ex.: `v1.1.0`) e clique em *Create new tag*.
5. Em **Release title**, coloque o título (ex.: `Versão 1.1.0 - Layout Mobile e Atualizações`).
6. No campo de descrição, cole a lista de novidades.
7. Na caixa **Attach binaries by dropping them here**, arraste e solte o seu arquivo `CronogramaDeEstudos.apk` (ou `app-release.apk`).
8. Clique no botão verde **Publish release**.
9. **Pegar o link direto do APK:**
   - Na página da release publicada, clique com o botão direito sobre o arquivo `.apk` em *Assets* e escolha **"Copiar endereço do link"**.
   - O link terá o formato:
     `https://github.com/SEU_USUARIO/SEU_REPO/releases/download/v1.1.0/CronogramaDeEstudos.apk`
   - Cole esse link no campo `apkUrl` do seu `version.json`.

---

## 🚀 Publicar a Nova Versão no Site

1. Com o `version.json` atualizado com o link do APK, envie os arquivos para a hospedagem do seu site (Netlify, GitHub Pages ou Vercel).
2. **Pronto!** 
   - Quem abrir o aplicativo instalado no celular receberá a notificação com a bolinha de aviso na aba **Atualizações**.
   - Ao tocar em **"Baixar nova versão (APK)"**, o usuário baixa o arquivo diretamente e instala a atualização com todos os dados preservados!
