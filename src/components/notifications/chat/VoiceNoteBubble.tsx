import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as ChatMediaCacheService from "../../../services/media/ChatMediaCacheService";

interface VoiceNoteBubbleProps {
  remoteUrl: string;
  isMe: boolean;
  durationMsHint?: number;
  token?: string | null;
  onLongPress?: () => void;
}

const formatDuration = (seconds: number): string => {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

// Separate component so expo-audio's useAudioPlayer is only instantiated for
// actual voice-note messages, not for every bubble in the message list.
const VoiceNoteBubble: React.FC<VoiceNoteBubbleProps> = ({ remoteUrl, isMe, durationMsHint, token, onLongPress }) => {
  const [playbackUri, setPlaybackUri] = React.useState(remoteUrl);

  React.useEffect(() => {
    let cancelled = false;
    ChatMediaCacheService.getLocalUri(remoteUrl).then((cached) => {
      if (cancelled) return;
      if (cached) {
        setPlaybackUri(cached);
        return;
      }
      ChatMediaCacheService.ensureCached(remoteUrl, token)
        .then((path) => {
          if (!cancelled && path) setPlaybackUri(path);
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [remoteUrl, token]);

  const player = useAudioPlayer({
    uri: playbackUri,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const status = useAudioPlayerStatus(player);

  const togglePlayback = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) {
      player.seekTo(0);
    }
    player.play();
  };

  const durationSeconds = status.duration || (durationMsHint ? durationMsHint / 1000 : 0);
  const progress = durationSeconds > 0 ? Math.min(1, status.currentTime / durationSeconds) : 0;

  return (
    <TouchableOpacity
      className="flex-row items-center"
      style={{ width: 200 }}
      activeOpacity={0.8}
      onPress={togglePlayback}
      onLongPress={onLongPress}
      delayLongPress={200}
    >
      <View className={`w-9 h-9 rounded-full items-center justify-center mr-2 ${isMe ? "bg-blue-600" : "bg-gray-200"}`}>
        <MaterialIcons
          name={status.playing ? "pause" : "play-arrow"}
          size={20}
          color={isMe ? "white" : "#374151"}
        />
      </View>
      <View className="flex-1">
        <View className="h-1 rounded-full bg-black/10 overflow-hidden">
          <View className="h-1 bg-blue-500" style={{ width: `${progress * 100}%` }} />
        </View>
        <Text className={`text-[10px] mt-1 ${isMe ? "text-gray-600" : "text-gray-400"}`}>
          {formatDuration(durationSeconds)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default VoiceNoteBubble;
