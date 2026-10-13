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
- **Pelo script automático de compilação (Recomendado):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\sync_and_build_apk.ps1
  ```
  *(O arquivo atualizado ficará salvo na pasta `apk\app-cronograma.apk`)*.
- **Ou pelo Android Studio:**
  1. Abra o Android Studio (`abrir_android_studio.bat`).
  2. Menu **Build** > **Generate Signed Bundle / APK...** > **APK**.
  3. Selecione a sua Keystore existente, digite as senhas e clique em **Next**.
  4. Marque a variante **release** e clique em **Create**.
  5. Ao terminar, renomeie o arquivo gerado para `app-cronograma.apk`.

---

## 🌐 Como Hospedar o APK Gratuitamente no GitHub Releases

O GitHub Releases é a melhor forma gratuita de hospedar o APK com link direto e seguro (HTTPS):

### ⚠️ Regras Cruciais para Evitar o Erro 404:
1. **O Repositório DEVE ser Público:**
   - O link de download do GitHub (`/releases/latest/download/...`) **dá erro 404** se o repositório for Privado, porque quem acessa pelo celular não está logado na sua conta.
   - **Opção A:** Manter o repositório `rodriguescrisostomo2353-sketch/cronograma-concursos` como Público. (Ele é seguro: não contém senhas nem chaves de assinatura).
   - **Opção B:** Se preferir deixar o código privado, crie um repositório novo e público chamado `cronograma-releases` apenas para publicar as Releases do APK.
2. **A Release DEVE estar PUBLICADA (Não em Rascunho / Draft):**
   - Se você apenas salvar como rascunho (*Save draft*), a release fica invisível para o público e o atalho `/releases/latest/` dá erro 404!
   - Você precisa obrigatoriamente clicar no botão verde **Publish release**.
3. **Nome Fixo e Padronizado do Arquivo:**
   - O arquivo DEVE se chamar exatamente: **`app-cronograma.apk`** (tudo em minúsculas, sem espaços, sem acentos).
   - O GitHub diferencia maiúsculas de minúsculas. Se você subir `App-Cronograma.apk` ou `CronogramaDeEstudos.apk`, o link dará 404!

---

### Passo a Passo no GitHub:

1. Acesse: `https://github.com/rodriguescrisostomo2353-sketch/cronograma-concursos/releases`
2. Clique no botão **Draft a new release** (ou *Create a new release*).
3. Em **Choose a tag**, digite a versão (exemplo: `v1.3.1`) e clique em *Create new tag*.
4. Em **Release title**, coloque o título (exemplo: `Versão 1.3.1 - Melhorias no Sistema de Atualização`).
5. No campo de descrição, cole as novidades da versão.
6. Na área **Attach binaries by dropping them here**, arraste e solte o arquivo:
   `apk\app-cronograma.apk`
7. Aguarde o upload da barra de progresso terminar.
8. **MUITO IMPORTANTE:** Clique no botão verde **Publish release** no final da página!
9. O link estável de download será sempre:
   ```
   https://github.com/rodriguescrisostomo2353-sketch/cronograma-concursos/releases/latest/download/app-cronograma.apk
   ```
   *(Este link já está configurado no seu `version.json`, então não precisa alterar mais nada nele!)*

---

## 🚀 Publicar a Nova Versão no Site

1. Com o `version.json` e o `index.html` atualizados, execute:
   `publication.bat`
   *(Ou faça `git push origin main` para enviar ao GitHub Pages)*.
2. **Pronto!** 
   - Quem abrir o aplicativo no celular receberá a notificação com a bolinha de aviso na aba **Atualizações**.
   - Ao tocar em **"📥 Baixar Nova Versão (APK)"**, o download do `app-cronograma.apk` iniciará diretamente pelo navegador do celular!
   - Caso haja qualquer oscilação de rede, o app exibirá o botão de tentar novamente e o link alternativo para a página de Releases.
