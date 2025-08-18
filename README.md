SpeakNow. ist eine Android-App zur Audioaufnahme, entwickelt im Rahmen der Prüfungsleistung im Fach Fallstudie – Hybride Anwendungsentwicklung im Kurs WWI2022A.
Die Anwendung stellt eine schlanke Lösung zum Aufnehmen, Abspielen und Verwalten von Sprachaufnahmen bereit und wurde in zwei Varianten umgesetzt.

📱 Funktionen
- Berechtigungen abfragen (Mikrofonzugriff)
- Audio aufnehmen und Aufnahme pausieren
- Audio abspielen und Wiedergabe pausieren
- Aufnahmen teilen
- Aufnahmen löschen

Im Repository finden sich zwei technisch unterschiedliche Implementierungen:

Branch main
- Umsetzung mit HTML5 Audio
- Standardkonforme Lösung ohne zusätzliche Plugins

Branch NativeAudioPlugIn
- Umsetzung mit dem Native Audio Plugin von Capacitor
- Abweichendes Verhalten bei der Hintergrundwiedergabe durch Eigenheiten des Plugins

! Beide Varianten bieten die gleiche Grundfunktionalität, unterscheiden sich jedoch der Audiowiedergabe bei Minimierung der App !

📦 Repository-Inhalte
- Quellcode für beide Varianten (main und NativeAudioPlugIn)
- APKs für die direkte Installation auf Android-Geräten
- PowerPoint-Slidedeck zur Präsentation der Prüfungsleistung


