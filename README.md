# Connecta 💜

Messenger ohne Handynummer – nur mit Username. Freunde adden, chatten, telefonieren und Videoanrufe.

## Starten
1. Node.js installieren (https://nodejs.org, Version 18 oder neuer)
2. Im Ordner `connecta` ein Terminal öffnen und eingeben:
   ```
   npm install
   npm start
   ```
3. Im Browser öffnen: http://localhost:3000

Zum Testen: Öffne die Seite in einem normalen und einem privaten Fenster, registriere zwei Usernames und addet euch gegenseitig.

## Funktionen
- Registrierung/Login mit Username + Passwort (Passwörter sicher mit bcrypt gehasht)
- Freunde per Username suchen, Anfragen senden, annehmen, ablehnen, entfernen
- Chat in Echtzeit, Verlauf wird gespeichert, „schreibt…“-Anzeige, Online-Status
- Sprach- und Videoanrufe (WebRTC) mit Stummschalten und Kamera aus
- Funktioniert auch am Handy

## Online stellen
- Anbieter wie **Render**, **Railway** oder ein eigener **VPS** (z. B. Hetzner) funktionieren.
- **HTTPS ist Pflicht**, sonst dürfen Browser Mikrofon und Kamera nicht benutzen (localhost geht ausnahmsweise ohne).
- Für Anrufe zwischen verschiedenen Netzen (z. B. Handy-Netz ↔ WLAN) brauchst du zusätzlich einen **TURN-Server**, z. B. coturn oder metered.ca. Trage ihn in `public/index.html` bei `ICE` ein.
- Die Daten liegen in `data.json`. Für viele Nutzer später auf eine echte Datenbank (z. B. PostgreSQL) umsteigen.
- In Deutschland brauchst du ein **Impressum** und eine **Datenschutzerklärung**.
