# ElectroGrid MT — Sistem de Localizare și Consultare Echipamente Medie Tensiune (20 kV)

Aplicație web completă, modernă și securizată pentru identificarea și navigarea către echipamentele de medie tensiune (PT, PCT, Separatoare MT). Dezvoltată conform cerințelor funcționale stricte din documentul oficial **`Ghid_simplu_ElectroGrid_MT.pdf`** și stilizată profesional pe baza prototipurilor de referință.

---

## ⚡ 1. Tehnologii Utilizate

- **Framework:** [Next.js 15 (App Router)](https://nextjs.org/) cu React 19 și TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) cu identitate vizuală industrială (bleumarin `#102c48`, `#123b57`, slate `#f0f4f7`)
- **Pictograme:** [Lucide React](https://lucide.dev/)
- **Bază de Date & Securitate:** [Supabase PostgreSQL](https://supabase.com/) cu Row Level Security (RLS) pe toate tabelele
- **Autentificare:** Supabase Auth (`@supabase/ssr`) cu mapare internă a numelor de utilizator și persistență pe cookie-uri securizate
- **Parsare Importuri Geografice:** `jszip` (dezarhivare securizată KMZ), `papaparse` (CSV cu suport UTF-8 BOM pentru Excel) și parser KML/XML pentru Placemarks, puncte și poligoane
- **Navigație:** Integrare directă cu Google Maps Navigation

---

## 🔒 2. Cele 4 Conturi Autorizate și Securitate

Conform cerințelor, aplicația nu permite înregistrare publică și este configurată exclusiv pentru **exact patru conturi autorizate**:

| Nume Utilizator | Parolă Implicită | Rol | Arie de Rețea Arondată |
| :--- | :--- | :--- | :--- |
| `admin` | `admin123` | **Administrator** | **Toate cele 5 zone MT** (acces complet) |
| `electrician_sacele` | `sacele123` | **Electrician** | **Săcele + Prejmer** |
| `electrician_rasnov` | `rasnov123` | **Electrician** | **Râșnov + Predeal** |
| `electrician_codlea` | `codlea123` | **Electrician** | **Codlea + Feldioara** |

*Notă:* Administratorul poate reasigna sau gestiona echipamente și linii din oricare dintre cele 5 zone prevăzute în ghid (inclusiv *Victoria + Făgăraș* și *Rupea*).

### Procedura de provizionare securizată a conturilor
Pentru a genera sau sincroniza aceste conturi în instanța Supabase Cloud:
```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="cheia_secreta_service_role"
node scripts/provision.mjs
```

---

## 🗺️ 3. Structura Ierarhică a Rețelei

Aplicația respectă cu strictețe ierarhia stabilită în ghid:

$$\text{Zonă} \longrightarrow \text{Stație Electrică} \longrightarrow \text{Linie 20 kV} \longrightarrow \text{Echipament}$$

### Cele 5 zone operaționale:
1. **Săcele + Prejmer**
2. **Râșnov + Predeal**
3. **Codlea + Feldioara**
4. **Victoria + Făgăraș**
5. **Rupea**

### Regula de Afișare a Echipamentelor (Strictețe PDF Secțiunea 3)
> **Regulă importantă:** Lista echipamentelor **NU este afișată automat**. Stația și linia de 20 kV trebuie selectate obligatoriu înainte de afișarea listei, deoarece denumiri identice (de exemplu, *PT 1* sau *Separator 1*) pot exista pe linii diferite sau în zone diferite.

---

## 🚦 4. Codul de Culori și Stările Echipamentelor (PDF Secțiunea 4)

Prioritatea stărilor este aplicată conform ghidului:

1. 🔴 **ROȘU — Indisponibil**
   - Echipamentul este marcat explicit indisponibil de către administrator (cu motiv obligatoriu, ex: mecanism defect, celulă în revizie).
   - **Această stare are prioritate absolută față de oricare alta.**
2. 🟡 **GALBEN — Observații / În curs de verificare**
   - Echipamentul are sesizări trimise de electricieni aflate în curs de verificare de către administrator (ex: acces dificil, lipsă manetă acționare, vegetație).
   - Sau are observații oficiale active pe fișă.
3. 🟢 **VERDE — Fără observații active în registru**
   - Nu există sesizări active în sistem.
   - ⚠️ **Avertisment de siguranță:** Culoarea verde **nu certifică faptul că echipamentul este apt de manevră**.

---

## 📋 5. Fluxul de Observații și Decizie Administrator

1. **Transmitere sesizare:** Electricianul deschide fișa echipamentului din teren, apasă *«Trimite observație»*, alege categoria (*Acces dificil*, *Defecțiune*, *Lipsă manetă*, *Poziție GPS greșită*, *Altele*) și descrie situația.
2. **Verificare administrator:** Observația intră în coada de așteptare a panoului de administrare (`/admin`).
3. **Decizie:** Administratorul analizează sesizarea și are la dispoziție trei acțiuni:
   - **Aprobă:** Observația este validată; opțional, textul este promovat automat în câmpul de observații oficiale ale echipamentului.
   - **Respinge:** Sesizarea este respinsă, cu salvarea motivului în jurnal.
   - **Solicită verificări:** Se solicită lămuriri suplimentare echipei din teren.
4. **Audit:** Orice decizie este înregistrată automat în istoricul modificărilor.

---

## 📥 6. Modulul de Import Date Rețea (Administrator)

Administratorul dispune de trei metode de populare și întreținere a bazei de date:

### A. Introducere manuală (CRUD complet)
- Formular dedicat pentru crearea și editarea echipamentelor (ID unic obligatoriu, denumire, tip, stație, linie, coordonate GPS, localitate, observații oficiale).
- Comutator rapid pentru declararea/anularea stării de indisponibilitate (ROȘU).

### B. Import fișiere KMZ / KML
- Suportă arhive `.kmz` (extragere securizată în memorie a `doc.kml`) și fișiere `.kml`.
- Extrage etichete `<Placemark>`, coordonate punctiforme și calculează centrul poligoanelor (cu avertisment explicit de centroid).
- Citește atribute extinse (`<SimpleData>` pentru ID, stație, linie, localitate).
- Oferă selector de linie țintă dacă fișierul geografic nu conține complet ierarhia electrică.

### C. Import fișiere CSV (Format Recomandat)
- Șablon descărcabil direct din interfață (`/api/template/csv`) cu antete predefinite și codare UTF-8 BOM pentru compatibilitate directă cu Microsoft Excel.
- Câmpuri suportate:
  - `Zona`
  - `Statie`
  - `Linie20kV`
  - `IdEchipament` *(obligatoriu unic)*
  - `Denumire`
  - `TipEchipament`
  - `Localitate`
  - `Latitudine` & `Longitudine`
  - `ObservatiiOficiale`
  - `Disponibilitate` *(Disponibil / Indisponibil)*
  - `MotivIndisponibilitate`
- Validare automată a coordonatelor, detectare duplicate în fișier și față de baza de date.
- Salvare tranzacțională cu previzualizare completă înainte de confirmare.

---

## 🚀 7. Rulare Locală și Dezvoltare

### Cerințe de sistem
- Node.js v18+ (testat pe Node.js v23)
- npm v10+

### Instalare și pornire
```bash
# 1. Navigare în folderul proiectului
cd electro-grid

# 2. Instalare dependințe
npm install

# 3. Rulare server de dezvoltare
npm run dev

# Aplicația va fi disponibilă la: http://localhost:3000
```

### Rulare teste automate
Proiectul include o suită completă de teste automate pentru prioritățile de stare, parsarea CSV/KML și regulile ierarhice:
```bash
node test/run-tests.mjs
```

### Construire pentru producție
```bash
npm run build
npm run start
```

---

## 🗄️ 8. Configurare Bază de Date Supabase (SQL)

Pentru instalarea în Supabase Cloud:
1. Accesați panoul Supabase SQL Editor.
2. Executați scriptul de migrare: [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)
3. Executați datele inițiale de rețea: [`supabase/seed.sql`](supabase/seed.sql)
4. Configurați fișierul `.env.local` conform `.env.example`.

---

## ⚠️ 9. Avertisment de Securitate și Utilizare (Disclaimer)

> **IMPORTANT:** ElectroGrid MT este un instrument exclusiv de consultare și localizare. Nu comandă echipamente, nu stabilește manevre și nu înlocuiește schemele operative sau dispozițiile de manevră emise de dispecerat. Culoarea verde indică doar absența sesizărilor active în registru și **NU certifică faptul că echipamentul este apt de manevră**.
