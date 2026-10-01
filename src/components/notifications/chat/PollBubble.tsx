import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { PollSummary } from "./ChatTypes";

interface PollBubbleProps {
  question: string;
  poll: PollSummary;
  isMe: boolean;
  isAdmin?: boolean;
  isCreator?: boolean;
  currentUserId?: string | number;
  isVoting?: boolean;
  // Resolved by MessageBubble.tsx and applied to the outer bubble itself
  // (see the comment there for why) — PollBubble just fills that fixed
  // width rather than computing its own, so there's only ever one source
  // of truth for how wide a poll is.
  width: number;
  onVote: (optionIds: (string | number)[]) => void;
  onClosePoll?: () => void;
  onViewVoters?: () => void;
}

const isSelected = (optionId: string | number, selected: (string | number)[]) =>
  selected.some((id) => String(id) === String(optionId));

const PollBubble: React.FC<PollBubbleProps> = ({
  question,
  poll,
  isMe,
  isAdmin,
  isCreator,
  isVoting,
  width: bubbleWidth,
  onVote,
  onClosePoll,
  onViewVoters,
}) => {
  const { options, total_votes, allows_multiple_answers, is_closed, my_voted_option_ids } = poll;
  const hasVoted = my_voted_option_ids.length > 0;
  const showViewVotes = !!isAdmin;
  const showEndPoll = !is_closed && (isCreator || isAdmin);

  const handlePressOption = (optionId: string | number) => {
    if (is_closed || isVoting) return;

    if (allows_multiple_answers) {
      const next = isSelected(optionId, my_voted_option_ids)
        ? my_voted_option_ids.filter((id) => String(id) !== String(optionId))
        : [...my_voted_option_ids, optionId];
      onVote(next);
    } else {
      // Single choice: tapping your own already-selected option is a no-op,
      // tapping any other option switches your vote to it.
      if (isSelected(optionId, my_voted_option_ids)) return;
      onVote([optionId]);
    }
  };

  return (
    <View style={{ width: bubbleWidth }}>
      <View className="flex-row items-start mb-2" style={{ width: "100%" }}>
        <View className={`w-7 h-7 rounded-full items-center justify-center mr-2 ${isMe ? "bg-white/20" : "bg-blue-50"}`}>
          <MaterialIcons name="poll" size={16} color={isMe ? "black" : "#2563eb"} />
        </View>
        <Text
          className={`font-bold text-[15px] ${isMe ? "text-black" : "text-gray-900"}`}
          style={{ flex: 1, flexShrink: 1, flexWrap: "wrap" }}
        >
          {question}
        </Text>
      </View>

      {is_closed && (
        <Text className={`text-[11px] font-semibold mb-2 ${isMe ? "text-black/60" : "text-gray-400"}`}>
          Poll closed
        </Text>
      )}

      <View style={{ width: "100%" }}>
        {options.map((option) => {
          const selected = isSelected(option.id, my_voted_option_ids);
          const percentage = total_votes > 0 ? Math.round((option.vote_count / total_votes) * 100) : 0;

          return (
            <TouchableOpacity
              key={option.id}
              activeOpacity={is_closed ? 1 : 0.7}
              onPress={() => handlePressOption(option.id)}
              className={`rounded-xl mb-2 px-4 py-2.5 border ${
                selected ? "border-blue-400 bg-blue-50" : isMe ? "border-black/10" : "border-gray-200"
              }`}
              // Explicit width (not just flex/stretch) so the row is always
              // exactly as wide as the poll bubble, never wider — that's
              // what makes long option text reliably wrap to a second line
              // instead of overflowing and getting clipped by the bubble's
              // overflow:hidden.
              style={{ width: "100%", opacity: isVoting ? 0.6 : 1 }}
            >
              <View className="flex-row items-start" style={{ width: "100%" }}>
                {selected && (
                  <MaterialIcons name="check-circle" size={16} color="#2563eb" style={{ marginRight: 6, marginTop: 1 }} />
                )}
                <Text
                  className={`text-[13px] ${selected ? "font-bold text-blue-700" : isMe ? "text-black" : "text-gray-800"}`}
                  style={{ flex: 1, flexShrink: 1, flexWrap: "wrap" }}
                >
                  {option.text}
                </Text>
                {hasVoted && (
                  <Text
                    className={`text-[11px] font-semibold ml-2 ${isMe ? "text-black/60" : "text-gray-500"}`}
                    style={{ flexShrink: 0 }}
                  >
                    {percentage}%
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text className={`text-[11px] mt-0.5 ${isMe ? "text-black/60" : "text-gray-400"}`}>
        {total_votes} {total_votes === 1 ? "vote" : "votes"}
        {allows_multiple_answers ? " · Multiple answers" : ""}
      </Text>

      {(showViewVotes || showEndPoll) && (
        <View className="flex-row flex-wrap items-center mt-1.5">
          {showViewVotes && (
            <TouchableOpacity onPress={onViewVoters} className="mr-4 mb-1" activeOpacity={0.7}>
              <Text className="text-[11px] font-bold text-blue-600">View votes</Text>
            </TouchableOpacity>
          )}
          {showEndPoll && (
            <TouchableOpacity onPress={onClosePoll} className="mb-1" activeOpacity={0.7}>
              <Text className="text-[11px] font-bold text-red-500">End poll</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isVoting && (
        <ActivityIndicator size="small" color={isMe ? "black" : "#2563eb"} style={{ marginTop: 4 }} />
      )}
    </View>
  );
};

export default PollBubble;
