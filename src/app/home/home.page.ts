import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AudioService } from '../services/audio.service';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { AudioRecorder } from '@capawesome-team/capacitor-audio-recorder';
import { PermissionService } from '../services/permission.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {

  recordings: string[] = [];
  isRecording = false;
  isPaused = false;
  permissionsGranted = false;
  audio = new Audio();

  // Neue Variablen für die Play/Pause-Logik
  currentlyPlayingFile: string | null = null;
  isAudioPaused = false;

  constructor(
    private audioService: AudioService,
    private permissionService: PermissionService,
    private cd: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    try {
      await this.permissionService.requestPermissions();
      const checkResult = await AudioRecorder.checkPermissions();
      this.permissionsGranted = checkResult.recordAudio === 'granted';
      this.cd.detectChanges();
    } catch (err) {
      console.error('❌ Fehler bei der Berechtigungsanfrage:', err);
      this.permissionsGranted = false;
    }
    await this.loadRecordings();
  }

  async loadRecordings() {
    try {
      const { files } = await Filesystem.readdir({ path: '', directory: Directory.Data });
      this.recordings = files
        .filter(file => file.name !== 'profileInstalled')
        .map(file => file.name);
      this.cd.detectChanges();
    } catch (e) {
      console.error('❌ Fehler beim Laden der Aufnahmen', e);
    }
  }

  async startRecording() {
    if (!this.permissionsGranted) {
      console.warn('⚠️ Keine Berechtigung zum Aufnehmen erteilt.');
      return;
    }
    try {
      // Stoppe die Wiedergabe, falls eine Aufnahme läuft
      this.audio.pause();
      this.currentlyPlayingFile = null;

      await this.audioService.startRecording();
      this.isRecording = true;
      this.isPaused = false;
    } catch (err) {
      console.error('❌ Fehler beim Starten der Aufnahme:', err);
    }
  }

  async pauseRecording() {
    try {
      await this.audioService.pauseRecording();
      this.isPaused = true;
    } catch (err) {
      console.error('❌ Fehler beim Pausieren:', err);
    }
  }

  async resumeRecording() {
    try {
      await this.audioService.resumeRecording();
      this.isPaused = false;
    } catch (err) {
      console.error('❌ Fehler beim Fortsetzen:', err);
    }
  }

  async stopRecording() {
    try {
      await this.audioService.stopRecording();
      this.isRecording = false;
      this.isPaused = false;
      await this.loadRecordings();
    } catch (error) {
      console.error('❌ Fehler beim Stoppen der Aufnahme:', error);
    }
  }

  async deleteRecording(fileName: string) {
    try {
      await Filesystem.deleteFile({ path: fileName, directory: Directory.Data });
      this.recordings = this.recordings.filter(r => r !== fileName);
      if (this.currentlyPlayingFile === fileName) {
        this.audio.pause();
        this.currentlyPlayingFile = null;
      }
      this.cd.detectChanges();
    } catch (e) {
      console.error('❌ Fehler beim Löschen:', e);
    }
  }

  async togglePlayback(fileName: string) {
    // Wenn die aktuelle Datei geklickt wird, pausiere oder setze fort
    if (this.currentlyPlayingFile === fileName) {
      if (this.isAudioPaused) {
        this.audio.play();
        this.isAudioPaused = false;
      } else {
        this.audio.pause();
        this.isAudioPaused = true;
      }
    } else {
      // Wenn eine neue Datei geklickt wird, starte die Wiedergabe
      try {
        const { uri } = await Filesystem.getUri({ directory: Directory.Data, path: fileName });
        this.audio.src = Capacitor.convertFileSrc(uri);
        this.audio.load();
        this.audio.play();

        this.currentlyPlayingFile = fileName;
        this.isAudioPaused = false;

        // Setze den Status zurück, wenn die Wiedergabe endet
        this.audio.onended = () => {
          this.currentlyPlayingFile = null;
          this.isAudioPaused = false;
          this.cd.detectChanges();
        };
      } catch (err) {
        console.error('❌ Fehler beim Abspielen', err);
        this.currentlyPlayingFile = null;
      }
    }
    this.cd.detectChanges();
  }

  async shareRecording(fileName: string) {
    try {
      const { uri } = await Filesystem.getUri({ directory: Directory.Data, path: fileName });
      await Share.share({
        title: 'Meine Aufnahme',
        text: 'Schau dir diese Aufnahme an',
        url: uri,
        dialogTitle: 'Aufnahme teilen'
      });
    } catch (err) {
      console.warn('⚠️ Teilen wurde vom Benutzer abgebrochen oder ist fehlgeschlagen:', err);
    }
  }
}
