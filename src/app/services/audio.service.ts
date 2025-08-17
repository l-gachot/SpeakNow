import { Injectable } from '@angular/core';
import { AudioRecorder } from '@capawesome-team/capacitor-audio-recorder';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { NativeAudio } from '@capacitor-community/native-audio';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private recordingActive = false;
  private preloadedAudios = new Map<string, string>();
  

  async startRecording(): Promise<void> {
    await this.stopAllAudios();
    
    await AudioRecorder.startRecording();
    this.recordingActive = true;
    console.log('🎙️ Aufnahme gestartet');
  }

  async pauseRecording(): Promise<void> {
    if (!this.recordingActive) return;
    await AudioRecorder.pauseRecording();
    console.log('⏸️ Aufnahme pausiert');
  }

  async resumeRecording(): Promise<void> {
    if (!this.recordingActive) return;
    await AudioRecorder.resumeRecording();
    console.log('▶️ Aufnahme fortgesetzt');
  }

  async stopRecording(): Promise<string> {
    if (!this.recordingActive) throw new Error('Keine aktive Aufnahme');
    const { uri } = await AudioRecorder.stopRecording(); 
    this.recordingActive = false;

    if (!uri) throw new Error('❌ Keine URI im Ergebnis von stopRecording()');

    const stamp = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fileName = `recording_${stamp.getFullYear()}-${pad(stamp.getMonth() + 1)}-${pad(stamp.getDate())}_${pad(stamp.getHours())}-${pad(stamp.getMinutes())}-${pad(stamp.getSeconds())}.m4a`;

    const dest = await Filesystem.getUri({ directory: Directory.Data, path: fileName });

    await FilePicker.copyFile({ from: uri, to: dest.uri });

    console.log('✅ Datei erfolgreich kopiert:', fileName);
    return fileName;
  }

  async preloadAudio(fileName: string): Promise<void> {
    try {
      if (this.preloadedAudios.has(fileName)) {
        await this.unloadAudio(fileName);
      }

      const { uri } = await Filesystem.getUri({ 
        directory: Directory.Data, 
        path: fileName 
      });

      const audioId = `audio_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      await NativeAudio.preload({
        assetId: audioId,
        assetPath: uri,
        audioChannelNum: 1,
        isUrl: true
      });

      this.preloadedAudios.set(fileName, audioId);
      console.log(`🎵 Audio vorgeladen: ${fileName} -> ${audioId}`);
    } catch (error) {
      console.error(`❌ Fehler beim Vorladen von ${fileName}:`, error);
      throw error;
    }
  }

  async playAudio(fileName: string): Promise<void> {
    try {
      if (!this.preloadedAudios.has(fileName)) {
        await this.preloadAudio(fileName);
      }

      const audioId = this.preloadedAudios.get(fileName)!;
      
      await NativeAudio.play({
        assetId: audioId
      });

      console.log(`▶️ Audio wird abgespielt: ${fileName}`);
    } catch (error) {
      console.error(`❌ Fehler beim Abspielen von ${fileName}:`, error);
      throw error;
    }
  }

  async pauseAudio(fileName: string): Promise<void> {
    try {
      const audioId = this.preloadedAudios.get(fileName);
      if (!audioId) return;

      await NativeAudio.pause({
        assetId: audioId
      });

      console.log(`⏸️ Audio pausiert: ${fileName}`);
    } catch (error) {
      console.error(`❌ Fehler beim Pausieren von ${fileName}:`, error);
    }
  }

  async resumeAudio(fileName: string): Promise<void> {
    try {
      const audioId = this.preloadedAudios.get(fileName);
      if (!audioId) return;

      await NativeAudio.resume({
        assetId: audioId
      });

      console.log(`▶️ Audio fortgesetzt: ${fileName}`);
    } catch (error) {
      console.error(`❌ Fehler beim Fortsetzen von ${fileName}:`, error);
    }
  }

  async stopAudio(fileName: string): Promise<void> {
    try {
      const audioId = this.preloadedAudios.get(fileName);
      if (!audioId) return;

      await NativeAudio.stop({
        assetId: audioId
      });

      console.log(`⏹️ Audio gestoppt: ${fileName}`);
    } catch (error) {
      console.error(`❌ Fehler beim Stoppen von ${fileName}:`, error);
    }
  }

  async unloadAudio(fileName: string): Promise<void> {
    try {
      const audioId = this.preloadedAudios.get(fileName);
      if (!audioId) return;

      await NativeAudio.unload({
        assetId: audioId
      });

      this.preloadedAudios.delete(fileName);
      console.log(`🗑️ Audio entladen: ${fileName}`);
    } catch (error) {
      console.error(`❌ Fehler beim Entladen von ${fileName}:`, error);
    }
  }

  async stopAllAudios(): Promise<void> {
    try {
      const promises = Array.from(this.preloadedAudios.keys()).map(fileName => 
        this.stopAudio(fileName)
      );
      
      await Promise.all(promises);
      console.log('⏹️ Alle Audios gestoppt');
    } catch (error) {
      console.error('❌ Fehler beim Stoppen aller Audios:', error);
    }
  }

  async isAudioPlaying(fileName: string): Promise<boolean> {
    try {
      const audioId = this.preloadedAudios.get(fileName);
      if (!audioId) return false;

      const result = await NativeAudio.isPlaying({
        assetId: audioId
      });

      return result.isPlaying;
    } catch (error) {
      console.warn(`⚠️ Audio ${fileName} nicht verfügbar für Status-Check:`, error);
      return false;
    }
  }

  async getCurrentlyPlayingAudios(): Promise<string[]> {
    try {
      const playingAudios: string[] = [];
      
      for (const [fileName, audioId] of this.preloadedAudios) {
        const result = await NativeAudio.isPlaying({
          assetId: audioId
        });
        
        if (result.isPlaying) {
          playingAudios.push(fileName);
        }
      }
      
      return playingAudios;
    } catch (error) {
      console.error('❌ Fehler beim Ermitteln laufender Audios:', error);
      return [];
    }
  }

  // Cleanup-Methode für Component Destroy
  async cleanup(): Promise<void> {
    try {
      const unloadPromises = Array.from(this.preloadedAudios.keys()).map(fileName =>
        this.unloadAudio(fileName)
      );
      
      await Promise.all(unloadPromises);
      console.log('🧹 Audio Service aufgeräumt');
    } catch (error) {
      console.error('❌ Fehler beim Aufräumen:', error);
    }
  }
}