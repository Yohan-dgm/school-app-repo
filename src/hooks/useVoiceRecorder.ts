import { useCallback } from "react";
import { Alert } from "react-native";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";

export interface VoiceRecording {
  uri: string;
  durationMillis: number;
}

// Tap-to-start / tap-to-stop voice note recording. Records to .m4a (HIGH_QUALITY
// preset) — sent through the existing chat "file" attachment pathway (same
// trick already used for video, which also isn't a distinct DB message type).
export const useVoiceRecorder = () => {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);

  const start = useCallback(async (): Promise<boolean> => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert("Permission needed", "Microphone access is required to record voice notes.");
      return false;
    }

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    return true;
  }, [recorder]);

  const stop = useCallback(async (): Promise<VoiceRecording | null> => {
    const durationMillis = recorderState.durationMillis ?? 0;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });

    if (!recorder.uri) return null;
    return { uri: recorder.uri, durationMillis };
  }, [recorder, recorderState.durationMillis]);

  const discard = useCallback(async (): Promise<void> => {
    if (recorderState.isRecording) {
      await recorder.stop();
    }
    await setAudioModeAsync({ allowsRecording: false });
  }, [recorder, recorderState.isRecording]);

  return {
    isRecording: recorderState.isRecording,
    durationMillis: recorderState.durationMillis ?? 0,
    start,
    stop,
    discard,
  };
};
