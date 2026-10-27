# Connecta 💜

Messenger ohne Handynummer – nur mit Username.

## Funktionen
- Freunde per Username, Chats, Gruppen, Sprach- & Videoanrufe
- Bilder, Videos, Audios und Sprachnachrichten senden
- @-Erwähnungen mit Benachrichtigung (auch @everyone in Gruppen)
- Status: Online, Abwesend, Bitte nicht stören, Unsichtbar + Status-Text
- Soundboard in Anrufen (12 eingebaute Sounds + eigene Sounds)
- Profil mit Bild, Banner, Bio, Pronomen
- Farbschema (Connecta, Dunkel, Hell), Schriftart und Nachrichtengröße
- Nachrichten anpinnen und löschen

## Lokal starten
```
npm install
npm start
```
Dann http://localhost:3000 öffnen. Ohne Datenbank wird lokal in `data.json` und `uploads/` gespeichert.

## Dauerhaft speichern (Neon + Render)
1. Kostenloses Konto auf https://neon.com anlegen und ein Projekt erstellen.
2. Den „Connection string“ kopieren (beginnt mit `postgresql://`).
3. Bei Render im Service unter **Environment** eine Variable anlegen:
   - Key: `DATABASE_URL`
   - Value: der kopierte Connection string
4. Speichern und neu deployen. In den Logs steht dann „Speicher: Postgres“.
