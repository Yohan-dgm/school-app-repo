import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface CreatePollModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: { question: string; options: string[]; allows_multiple_answers: boolean }) => void;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 12;

// Mirrors CreateGroupModal.tsx's wizard pattern: per-step state, a
// reset-on-open effect, inline step validation, one final onCreate() call.
const CreatePollModal: React.FC<CreatePollModalProps> = ({ visible, onClose, onCreate }) => {
  const [step, setStep] = useState(1);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowsMultipleAnswers, setAllowsMultipleAnswers] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setQuestion("");
      setOptions(["", ""]);
      setAllowsMultipleAnswers(false);
    }
  }, [visible]);

  const handleOptionChange = (index: number, text: string) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? text : opt)));
  };

  const handleAddOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (!question.trim()) {
      Alert.alert("Required", "Please enter a poll question.");
      return;
    }
    const filledOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (filledOptions.length < MIN_OPTIONS) {
      Alert.alert("Required", `Please enter at least ${MIN_OPTIONS} options.`);
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      onClose();
    }
  };

  const handleCreate = () => {
    const filledOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    onCreate({
      question: question.trim(),
      options: filledOptions,
      allows_multiple_answers: allowsMultipleAnswers,
    });
  };

  const renderStep1 = () => (
    <View className="flex-1 px-4">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-bold text-gray-700 ml-1">Question *</Text>
            <Text className={`text-[10px] ${question.length >= 500 ? "text-red-500" : "text-gray-400"}`}>
              {question.length}/500
            </Text>
          </View>
          <TextInput
            placeholder="Ask a question..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={500}
            className="bg-gray-50 rounded-2xl px-4 py-4 text-gray-900 border border-gray-100"
            textAlignVertical="top"
            value={question}
            onChangeText={setQuestion}
          />
        </View>

        <Text className="text-sm font-bold text-gray-700 ml-1 mb-2">Options *</Text>
        {options.map((option, index) => (
          <View key={index} className="flex-row items-center mb-3">
            <TextInput
              placeholder={`Option ${index + 1}`}
              placeholderTextColor="#9ca3af"
              maxLength={200}
              className="flex-1 bg-gray-50 rounded-2xl px-4 py-3.5 text-gray-900 border border-gray-100"
              value={option}
              onChangeText={(text) => handleOptionChange(index, text)}
            />
            {options.length > MIN_OPTIONS && (
              <TouchableOpacity onPress={() => handleRemoveOption(index)} className="p-2 ml-1">
                <MaterialIcons name="remove-circle-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {options.length < MAX_OPTIONS && (
          <TouchableOpacity onPress={handleAddOption} className="flex-row items-center py-3" activeOpacity={0.7}>
            <MaterialIcons name="add-circle-outline" size={20} color="#2563eb" />
            <Text className="text-blue-600 font-bold ml-2">Add option</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View className="py-6">
        <TouchableOpacity onPress={handleNext} className="h-14 rounded-2xl items-center justify-center shadow-lg bg-blue-600">
          <Text className="text-lg font-bold text-white">Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View className="flex-1 px-4">
      <Text className="text-gray-500 mb-6">Review your poll before sending it to the group.</Text>

      <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
        <Text className="font-bold text-gray-900 mb-3">{question}</Text>
        {options
          .map((o) => o.trim())
          .filter((o) => o.length > 0)
          .map((option, index) => (
            <View key={index} className="flex-row items-center py-1.5">
              <MaterialIcons name="radio-button-unchecked" size={16} color="#9ca3af" />
              <Text className="text-gray-700 ml-2">{option}</Text>
            </View>
          ))}
      </View>

      <View className="flex-row items-center justify-between bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
        <View className="flex-1 mr-4">
          <Text className="text-[15px] font-bold text-blue-700 mb-1">Allow Multiple Answers</Text>
          <Text className="text-xs text-blue-500">Members can select more than one option</Text>
        </View>
        <TouchableOpacity
          onPress={() => setAllowsMultipleAnswers(!allowsMultipleAnswers)}
          className={`w-12 h-6 rounded-full items-center justify-center ${allowsMultipleAnswers ? "bg-blue-600" : "bg-gray-300"}`}
        >
          <View className={`w-4 h-4 bg-white rounded-full absolute ${allowsMultipleAnswers ? "right-1" : "left-1"}`} />
        </TouchableOpacity>
      </View>

      <View className="flex-row space-x-4 mt-auto py-6">
        <TouchableOpacity onPress={handleBack} className="flex-1 h-14 rounded-2xl items-center justify-center bg-gray-100">
          <Text className="text-lg font-bold text-gray-600">Back</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCreate} className="flex-[2] h-14 rounded-2xl items-center justify-center shadow-lg bg-green-600">
          <Text className="text-lg font-bold text-white">Create Poll</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/40">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
          <View className="flex-1 mt-20 bg-white rounded-t-[40px] shadow-2xl">
            <View className="px-6 py-8 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <TouchableOpacity onPress={handleBack} className="mr-3">
                  <MaterialIcons name={step > 1 ? "arrow-back" : "close"} size={28} color="#374151" />
                </TouchableOpacity>
                <View>
                  <Text className="text-2xl font-bold text-gray-900">{step === 1 ? "Create Poll" : "Review Poll"}</Text>
                  <View className="flex-row items-center mt-1">
                    <View className={`h-1.5 w-8 rounded-full ${step >= 1 ? "bg-blue-600" : "bg-gray-200"}`} />
                    <View className={`h-1.5 w-8 rounded-full ml-1 ${step >= 2 ? "bg-blue-600" : "bg-gray-200"}`} />
                  </View>
                </View>
              </View>
            </View>

            {step === 1 ? renderStep1() : renderStep2()}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default CreatePollModal;
