import { Injectable } from '@angular/core';
import { AudioRecorder } from '@capawesome-team/capacitor-audio-recorder';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FilePicker } from '@capawesome/capacitor-file-picker';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private recordingActive = false;

  async startRecording(): Promise<void> {
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
}
