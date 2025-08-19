import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { AudioService } from '../services/audio.service';
import { PermissionService } from '../services/permission.service';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { App } from '@capacitor/app';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  recordings: string[] = [];
  isRecording = false;
  isPaused = false;
  permissionsGranted = false;

  currentlyPlayingFile: string | null = null;
  isAudioPaused = false;
  audioStatusInterval: any = null;
  private appStateListener: any = null;

  constructor(
    private audioService: AudioService,
    private permissionService: PermissionService,
    private cd: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    try {
      this.permissionsGranted = await this.permissionService.requestPermissions();
    } catch {
      this.permissionsGranted = false;
    }

    await this.loadRecordings();
    
    await this.syncAudioStatus();
    
    this.setupAppStateListener();
  }

  async ngOnDestroy() {
    await this.audioService.cleanup();
    
    if (this.audioStatusInterval) {
      clearInterval(this.audioStatusInterval);
    }
    
    if (this.appStateListener) {
      this.appStateListener.remove();
    }
  }

private setupAppStateListener() {
  this.appStateListener = App.addListener('appStateChange', async (state) => {
    if (state.isActive) {
      setTimeout(async () => {
        await this.syncAudioStatus();
      }, 100); 
    } else {
      if (this.currentlyPlayingFile) {
        try {
          await this.audioService.pauseAudio(this.currentlyPlayingFile);
          console.log('Playback bei App-Inaktivität pausiert.');
        } catch (error) {
          console.error('Fehler beim Pausieren des Playbacks:', error);
        }
      }
    }
  });
}

  async loadRecordings() {
    try {
      const { files } = await Filesystem.readdir({ path: '', directory: Directory.Data });

      const filteredFiles = files.filter(file => {
        const name = file.name ?? '';
        const systemFiles = ['profileInstalled','rList','.DS_Store','Thumbs.db','.gitkeep'];
        const isSystem = systemFiles.includes(name) || name.startsWith('.') || name.length === 0 || !name.includes('.');
        const isAudio = /\.(mp3|wav|m4a|aac|ogg|webm)$/i.test(name) || name.includes('recording');
        return !isSystem && isAudio;
      });

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
      await this.stopCurrentPlayback();
      
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

  private async stopCurrentPlayback() {
    if (this.currentlyPlayingFile) {
      await this.audioService.stopAudio(this.currentlyPlayingFile);
      this.currentlyPlayingFile = null;
      this.isAudioPaused = false;
      this.clearAudioStatusInterval();
      this.cd.detectChanges();
    }
  }

  private startAudioStatusPolling(fileName: string) {
    this.clearAudioStatusInterval();
    this.audioStatusInterval = setInterval(async () => {
      try {
        const isPlaying = await this.audioService.isAudioPlaying(fileName);
        
        if (!isPlaying && this.currentlyPlayingFile === fileName) {
          this.currentlyPlayingFile = null;
          this.isAudioPaused = false;
          this.clearAudioStatusInterval();
          this.cd.detectChanges();
        }
      } catch (error) {
        console.error('❌ Fehler beim Status-Polling:', error);
        this.clearAudioStatusInterval();
      }
    }, 500);
  }

  private clearAudioStatusInterval() {
    if (this.audioStatusInterval) {
      clearInterval(this.audioStatusInterval);
      this.audioStatusInterval = null;
    }
  }

private async syncAudioStatus() {
    try {
      await this.audioService.stopAllAudios();
      console.log('🔄 Alle Audios bei Status-Sync gestoppt.');
    } catch (error) {
      console.error('❌ Fehler beim Stoppen aller Audios während Sync:', error);
    }

    this.currentlyPlayingFile = null;
    this.isAudioPaused = false;
    this.clearAudioStatusInterval();
    this.cd.detectChanges();
  }

async togglePlayback(fileName: string) {
  try {
    if (this.currentlyPlayingFile === fileName) {
      await this.audioService.stopAudio(fileName); 
      this.isAudioPaused = false;
      this.currentlyPlayingFile = null;
      this.clearAudioStatusInterval();
    } else {
      await this.stopCurrentPlayback();

      await this.audioService.playAudio(fileName);
      this.currentlyPlayingFile = fileName;
      this.isAudioPaused = false;
      this.startAudioStatusPolling(fileName);
    }

    this.cd.detectChanges();
  } catch (err) {
    console.error('❌ Fehler beim Abspielen:', err);
    this.currentlyPlayingFile = null;
    this.isAudioPaused = false;
    this.clearAudioStatusInterval();
    this.cd.detectChanges();
  }
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
      if (this.currentlyPlayingFile === fileName) {
        await this.stopCurrentPlayback();
      }
      
      await this.audioService.unloadAudio(fileName);
      
      await Filesystem.deleteFile({ path: fileName, directory: Directory.Data });
      
      this.recordings = this.recordings.filter(r => r !== fileName);
      this.cd.detectChanges();
    } catch (e) {
      console.error('❌ Fehler beim Löschen:', e);
    }
  }
}