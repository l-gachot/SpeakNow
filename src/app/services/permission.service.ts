import { Injectable } from '@angular/core';
import { AudioRecorder } from '@capawesome-team/capacitor-audio-recorder';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  async requestPermissions(): Promise<void> {
    try {
      await AudioRecorder.requestPermissions();
      console.log('✅ Berechtigungen erteilt');
    } catch (err) {
      console.error('❌ Fehler beim Anfordern von Berechtigungen:', err);
      throw err;
    }
  }
}

