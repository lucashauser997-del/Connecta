# Connecta 💜

Messenger ohne Handynummer – nur mit Username.

## Funktionen
- Freunde per Username, Freunde anpinnen, Chats, Gruppen (Größe im Dashboard einstellbar), Notizen-Chat
- **Server wie bei Discord**: Kanäle, Rollen mit Farben, Berechtigungen, Einladungslinks, Kick & Bann
- **Storys** (24 Stunden, Foto/Video/Text, Aufrufe, Antworten)
- Sprach- & Videoanrufe mit **Bildschirmübertragung**, Soundboard, Mikrofonwahl – der Chat bleibt beim Anruf sichtbar
- Bilder, Videos, Audios, Sprachnachrichten, **Emojis**, **GIFs**, Antworten auf Nachrichten
- @-Erwähnungen, Lesebestätigungen, Status, Abzeichen, Blockieren, **Melden**
- **Developer Dashboard** (nur Owner): Statistiken, Nutzer ausloggen/sperren/bannen, Meldungen, offizielle Mitteilungen
- Eigenes Farbschema, Schriftarten, Nutzungsbedingungen unter `/tos`
- Funktioniert im Handy-Browser und lässt sich als App auf den Startbildschirm legen

## Lokal starten
```
npm install
npm start
```
Dann http://localhost:3000 öffnen.

## Einstellungen bei Render (Environment)
| Key | Wert | Pflicht? |
|---|---|---|
| `DATABASE_URL` | Connection string von Neon | ja, damit Daten erhalten bleiben |
| `OWNER` | dein Connecta-Username | ja, für Dashboard & Entwickler-Abzeichen |
| `GIPHY_API_KEY` | kostenloser Schlüssel von developers.giphy.com | für GIFs |
| `TURN_URL`, `TURN_USER`, `TURN_PASS` | Daten eines TURN-Servers (z. B. metered.ca) | für Anrufe zwischen Handy-Netz und WLAN |

## Vor dem Veröffentlichen
In `public/tos.html` die Platzhalter in eckigen Klammern (Name, Adresse, E-Mail) ausfüllen. In Deutschland brauchst du außerdem ein Impressum und eine Datenschutzerklärung.
