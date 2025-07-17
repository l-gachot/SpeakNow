import { Injectable } from '@angular/core';
import { AudioRecorder, StopRecordingResult } from '@capawesome-team/capacitor-audio-recorder';
import { Filesystem, Directory } from '@capacitor/filesystem';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private lastResult?: StopRecordingResult;

  constructor() {}

  async startRecording(): Promise<void> {
    await AudioRecorder.startRecording();
    console.log('🎙️ Aufnahme gestartet');
  }

  async pauseRecording(): Promise<void> {
    await AudioRecorder.pauseRecording();
    console.log('⏸️ Aufnahme pausiert');
  }

  async resumeRecording(): Promise<void> {
    await AudioRecorder.resumeRecording();
    console.log('▶️ Aufnahme fortgesetzt');
  }

  async stopRecording(): Promise<string> {
    try {
      const result: StopRecordingResult = await AudioRecorder.stopRecording();
      if (!result.uri) {
        throw new Error('❌ Keine URI im Ergebnis von stopRecording()');
      }

      this.lastResult = result;
      const fileName = `recording_${Date.now()}.m4a`;

      await Filesystem.copy({
        from: result.uri,
        to: fileName,
        toDirectory: Directory.Data, 
      });

      console.log('✅ Datei erfolgreich kopiert:', fileName);
      return fileName;
    } catch (err) {
      console.error('❌ Fehler beim Stoppen oder Kopieren der Aufnahme:', err);
      throw err;
    }
  }

  getLastResult(): StopRecordingResult | undefined {
    return this.lastResult;
  }
}