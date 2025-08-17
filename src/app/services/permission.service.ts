import { Injectable } from '@angular/core';
import { AudioRecorder } from '@capawesome-team/capacitor-audio-recorder';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  async requestPermissions(): Promise<boolean> {
    try {
      const res = await AudioRecorder.requestPermissions();
      const granted = res.recordAudio === 'granted';
      console.log(granted ? '✅ Mic-Berechtigung erteilt' : '⚠️ Mic-Berechtigung verweigert');
      return granted;
    } catch (err) {
      console.error('❌ Fehler beim Anfordern von Berechtigungen:', err);
      return false;
    }
  }

  async checkPermissions(): Promise<boolean> {
    try {
      const res = await AudioRecorder.checkPermissions();
      return res.recordAudio === 'granted';
    } catch (err) {
      console.error('❌ Fehler beim Prüfen der Berechtigungen:', err);
      return false;
    }
  }
}
