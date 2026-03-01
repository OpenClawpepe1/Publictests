# ⚡ Time of Troubles — D&D Campaign Dashboard

Dashboard multiplayer per la campagna **Time of Troubles** (1358 DR, Costa della Spada).  
Sincronizzazione in tempo reale tra DM e giocatori via Firebase.

## Funzionalità

| Feature | Descrizione |
|---------|-------------|
| 🗺️ Mappa interattiva | Costa della Spada con località cliccabili, posizione party condivisa |
| 👥 Gestione Party | Schede complete per DM + 6 giocatori, sincronizzate in real-time |
| 🖼️ Avatar | Upload immagini profilo per ogni personaggio |
| 📄 Schede PDF | Upload e download schede personaggio (PDF/immagini) |
| 📜 Diario | Registro sessioni condiviso con bottino e XP |
| ⚔️ Combattimento | Tracker iniziativa + dice roller |
| 🎲 Strumenti | Riferimenti rapidi, info campagna |

---

## Setup Completo (10 minuti)

### 1. Clona e installa

```bash
git clone https://github.com/TUO-USERNAME/dnd-time-of-troubles.git
cd dnd-time-of-troubles
npm install
```

### 2. Crea progetto Firebase

1. Vai su [console.firebase.google.com](https://console.firebase.google.com)
2. Clicca **"Aggiungi progetto"** → nome: `dnd-time-of-troubles`
3. Disattiva Google Analytics (non serve) → **Crea progetto**

### 3. Aggiungi app Web

1. Nella dashboard Firebase, clicca l'icona **Web** (`</>`)
2. Nome: `dashboard` → **Registra app**
3. Copia i valori di configurazione (ti serviranno al punto 6)

### 4. Attiva Firestore

1. Menu laterale → **Firestore Database** → **Crea database**
2. Seleziona **"Avvia in modalità test"**
3. Scegli la region **europe-west1** (o la più vicina)
4. Vai su **Regole** e incolla:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /campaigns/{campaignId}/{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 5. Attiva Storage

1. Menu laterale → **Storage** → **Inizia**
2. Seleziona **"Avvia in modalità test"**
3. Vai su **Regole** e incolla:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /campaigns/{campaignId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```

### 6. Configura variabili d'ambiente

Crea un file `.env` nella root del progetto:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=dnd-time-of-troubles.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dnd-time-of-troubles
VITE_FIREBASE_STORAGE_BUCKET=dnd-time-of-troubles.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

> ⚠️ I valori li trovi in Firebase Console → Impostazioni progetto → Le tue app

### 7. Testa in locale

```bash
npm run dev
```

Apri `http://localhost:5173` — dovresti vedere la dashboard con l'indicatore **LIVE** verde.

---

## Deploy su Vercel

### Via GitHub (consigliato)

```bash
git add .
git commit -m "D&D Time of Troubles dashboard v2"
git push origin main
```

1. Vai su [vercel.com](https://vercel.com) → accedi con GitHub
2. **Add New Project** → importa il repo
3. In **Environment Variables** aggiungi TUTTE le variabili del `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Clicca **Deploy**
5. Condividi l'URL nel gruppo! 🎉

### Aggiornamenti futuri

Ogni `git push` su main farà un re-deploy automatico su Vercel.

---

## Note Tecniche

- **Sincronizzazione**: Firestore real-time listeners — ogni modifica è visibile istantaneamente a tutti
- **Upload**: Avatar (max 5MB, immagini) e schede personaggio (max 10MB, PDF/immagini)
- **Nessuna autenticazione**: il progetto usa regole "test mode" — chiunque con l'URL può accedere. Per un gruppo di 7 persone è perfetto.
- **Regolamento**: D&D 2024 con Oath da PHB 2014
- **Ambientazione**: Forgotten Realms, 1358 DR — Time of Troubles

---

## Struttura

```
├── src/
│   ├── lib/
│   │   └── firebase.js      # Init + CRUD + upload helpers
│   ├── App.jsx               # Dashboard completa
│   └── main.jsx              # Entry point
├── firestore.rules           # Regole Firestore (riferimento)
├── storage.rules             # Regole Storage (riferimento)
├── .env.example              # Template variabili d'ambiente
└── package.json
```
