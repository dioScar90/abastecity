# ⛽ Abastecity

PWA para controle de abastecimentos e cálculo da autonomia real (km/l) do seu
veículo. Construído com **TypeScript puro + Web Components + Tailwind CSS** e
**Firebase** (Authentication + Firestore + Hosting).

## ✨ Funcionalidades

- 🔐 **Login com Google** (Firebase Authentication)
- 🚗 **Cadastro de um veículo por conta** (marca, modelo, ano, tanque, combustível)
- ⛽ **Registro de abastecimentos** (data, litros, hodômetro, preço/litro, tanque cheio)
- ✏️ **Edição e exclusão** de registros
- 📊 **Gráfico de autonomia (km/l)** calculado entre tanques cheios, atualizado dinamicamente
- 📱 **PWA instalável** com funcionamento **offline** (cache de dados)
- 🔒 **Isolamento de dados por usuário** via regras de segurança do Firestore
- 📐 **Responsivo** (mobile, tablet e desktop)

## 🧱 Stack técnica

| Camada       | Tecnologia                                |
| ------------ | ----------------------------------------- |
| Linguagem    | TypeScript (sem frameworks)               |
| UI           | Web Components (Custom Elements + Shadow DOM) |
| Estilo       | Tailwind CSS                              |
| Build        | Vite + vite-plugin-pwa                    |
| Gráficos     | Chart.js                                  |
| Backend      | Firebase (Auth + Firestore + Hosting)     |

## 📂 Estrutura

```
abastecity/
├── index.html
├── firebase.json            # Hosting + Firestore
├── firestore.rules          # Regras de segurança (isolamento por usuário)
├── .env.example             # Modelo das credenciais do Firebase
├── scripts/
│   └── generate-icons.py    # Gera os ícones PNG do PWA
├── public/
│   ├── favicon.svg
│   └── icons/               # icon-192, icon-512, icon-maskable-512
└── src/
    ├── main.ts              # Ponto de entrada
    ├── style.css            # Tailwind + estilos base
    ├── types/               # Tipos (Vehicle, Refueling, ...)
    ├── utils/               # efficiency.ts (km/l), format.ts, toast.ts
    ├── firebase/            # config, auth, firestore
    ├── state/               # store reativo (pub/sub)
    └── components/          # Web Components
        ├── login-button.ts
        ├── app-header.ts
        ├── vehicle-form.ts
        ├── vehicle-card.ts
        ├── refueling-modal.ts   # <dialog> nativo encapsulado
        ├── refueling-table.ts
        ├── efficiency-chart.ts
        └── app-root.ts          # orquestrador
```

## 🧮 Como a autonomia (km/l) é calculada

O cálculo usa o **método do tanque cheio**, o mais preciso:

1. A medição só ocorre entre dois abastecimentos com **tanque cheio**.
2. O primeiro tanque cheio é o "marco zero" (referência de hodômetro).
3. A cada tanque cheio seguinte:

   ```
   km/l do trecho = (hodômetro atual − hodômetro do último cheio) ÷ litros somados no trecho
   ```

   Os litros somados representam exatamente o combustível gasto para percorrer
   a distância, já que o tanque voltou a ficar cheio. Abastecimentos parciais
   acumulam litros, mas não fecham um trecho.

A média geral é ponderada pela distância: `Σ distâncias ÷ Σ litros`.
A lógica está em [`src/utils/efficiency.ts`](src/utils/efficiency.ts).

---

## 🚀 Configuração do Firebase (passo a passo)

### 1. Crie o projeto

1. Acesse o [Firebase Console](https://console.firebase.google.com/) e clique em **Adicionar projeto**.
2. Dê um nome (ex.: `abastecity`) e conclua a criação.

### 2. Habilite a autenticação com Google

1. No menu lateral: **Build → Authentication → Get started**.
2. Aba **Sign-in method → Google → Ativar**. Defina o e-mail de suporte e salve.

### 3. Crie o banco Firestore

1. Menu: **Build → Firestore Database → Create database**.
2. Escolha o modo **Produção** e uma região (ex.: `southamerica-east1`).

### 4. Registre o app web e copie as credenciais

1. **Configurações do projeto** (⚙️) → seção **Seus apps** → ícone **Web (`</>`)**.
2. Registre o app (não precisa marcar Hosting aqui).
3. Copie o objeto `firebaseConfig`.

### 5. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Preencha o `.env` com os valores do `firebaseConfig`:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
```

> As chaves de app web do Firebase são públicas por natureza. A proteção dos
> dados vem das **regras do Firestore** (`firestore.rules`).

---

## 💻 Desenvolvimento local

```bash
# 1. Instale as dependências
npm install

# 2. (Opcional) Regenere os ícones do PWA
python scripts/generate-icons.py

# 3. Rode em modo desenvolvimento
npm run dev
```

Acesse o endereço exibido (geralmente `http://localhost:5173`).

> Para o login com Google funcionar localmente, adicione `localhost` em
> **Authentication → Settings → Authorized domains** (já vem por padrão).

---

## ☁️ Deploy no Firebase Hosting

### Pré-requisitos

```bash
npm install -g firebase-tools
firebase login
```

### Vincule o projeto

Edite o [`.firebaserc`](.firebaserc) e substitua `SEU_PROJECT_ID` pelo ID do seu
projeto — ou rode:

```bash
firebase use --add
```

### Publique as regras de segurança

```bash
npm run deploy:rules
# (equivale a: firebase deploy --only firestore:rules)
```

### Publique a aplicação

```bash
npm run deploy
# build + firebase deploy (hosting + rules)
```

Ou apenas o hosting:

```bash
npm run deploy:hosting
```

Ao final, o Firebase exibirá a **Hosting URL** do app no ar.

> **Importante:** adicione o domínio de produção (ex.: `seu-projeto.web.app`)
> em **Authentication → Settings → Authorized domains** para liberar o login.

---

## 📜 Scripts disponíveis

| Comando                  | Descrição                                  |
| ------------------------ | ------------------------------------------ |
| `npm run dev`            | Servidor de desenvolvimento (Vite)         |
| `npm run build`          | Type-check + build de produção (`dist/`)   |
| `npm run preview`        | Pré-visualiza o build localmente           |
| `npm run deploy`         | Build + deploy completo (hosting + rules)  |
| `npm run deploy:hosting` | Deploy apenas do hosting                   |
| `npm run deploy:rules`   | Deploy apenas das regras do Firestore      |

---

## 🗃️ Modelo de dados (Firestore)

```
users/{uid}                      → { vehicle: { make, model, year, plate?, tankCapacity, fuelType, updatedAt } }
users/{uid}/refuelings/{autoId}  → { date, liters, odometer, pricePerLiter?, fullTank, createdAt }
```

As regras garantem que `request.auth.uid` corresponde ao `{uid}` do caminho —
nenhum usuário acessa dados de outro.

## 📄 Licença

MIT.
