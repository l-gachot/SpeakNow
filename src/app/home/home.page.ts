import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AudioService } from '../services/audio.service';
import { PermissionService } from '../services/permission.service';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

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
  currentlyPlayingFile: string | null = null;
  isAudioPaused = false;

  constructor(
    private audioService: AudioService,
    private permissionService: PermissionService,
    private cd: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    try {
      // Permissions anfragen und Status speichern
      this.permissionsGranted = await this.permissionService.requestPermissions();
    } catch {
      this.permissionsGranted = false;
    }

    // Vorhandene Aufnahmen laden (Persistenz)
    await this.loadRecordings();
  }

  async loadRecordings() {
    try {
      const { files } = await Filesystem.readdir({ path: '', directory: Directory.Data });

      // System-/Service-Dateien rausfiltern + nur Audiodateien nehmen
      const filteredFiles = files.filter(file => {
        const name = file.name ?? '';
        const systemFiles = ['profileInstalled','rList','.DS_Store','Thumbs.db','.gitkeep'];
        const isSystem = systemFiles.includes(name) || name.startsWith('.') || name.length === 0 || !name.includes('.');
        const isAudio = /\.(mp3|wav|m4a|aac|ogg|webm)$/i.test(name) || name.includes('recording');
        return !isSystem && isAudio;
      });

      // Nach Änderungszeit sortieren (neueste zuerst)
      const withDates = await Promise.all(filteredFiles.map(async f => {
        const stat = await Filesystem.stat({ path: f.name, directory: Directory.Data });
        return { name: f.name, mtime: stat.mtime ?? 0 };
      }));

      this.recordings = withDates.sort((a,b) => b.mtime - a.mtime).map(f => f.name);
      this.cd.detectChanges();
    } catch (e) {
      console.error('❌ Fehler beim Laden der Aufnahmen', e);
    }
  }

  async startRecording() {
    if (!this.permissionsGranted) {
      console.warn('⚠️ Keine Berechtigung zum Aufnehmen.');
      return;
    }
    try {
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
    } catch (err) {
      console.error('❌ Fehler beim Stoppen:', err);
    }
  }

async togglePlayback(fileName: string) {
  if (this.currentlyPlayingFile === fileName) {
    this.audio.pause();
    this.audio.currentTime = 0; // zurück an den Anfang
    this.currentlyPlayingFile = null;
    this.isAudioPaused = false;
  } else {
    try {
      const { uri } = await Filesystem.getUri({ directory: Directory.Data, path: fileName });
      this.audio.src = Capacitor.convertFileSrc(uri);
      this.audio.load();
      await this.audio.play();

      this.currentlyPlayingFile = fileName;
      this.isAudioPaused = false;

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
        files: [uri],
        dialogTitle: 'Aufnahme teilen'
      });
    } catch (err) {
      console.warn('⚠️ Teilen abgebrochen oder fehlgeschlagen:', err);
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
}
