import React, { forwardRef, useImperativeHandle, useState, useCallback } from "react";
import { Modal, View, StyleSheet, Alert } from "react-native";
import ChatView from "./ChatView";
import GroupInfoScreen from "./GroupInfoScreen";
import { ChatGroup } from "./ChatTypes";

export interface ChatRoomModalRef {
  open: (group: ChatGroup) => void;
  close: () => void;
}

interface ChatRoomModalProps {
  currentUserId: string;
  onGroupDeleted: (groupId: string) => void;
}

const MARGIN = 24;

// Full-screen chat room, built on React Native's own <Modal> directly (not
// react-native-modalize). Modalize was tried first (matching the pattern
// used by this app's dashboard modals) but it always wraps its content in
// its own ScrollView internally (via `children`, `scrollViewProps`, or
// `customRenderer` — every path goes through it), and that ScrollView does
// not bound its content to the visible screen height: ChatView's flex:1
// layout (header/messages/input bar) either collapsed or silently overflowed
// past the bottom of the screen depending on which Modalize option was used.
//
// A plain <Modal> has none of that — it's a real OS-level overlay (so it
// correctly covers the app's own header, which sits as a sibling higher up
// the tree) and its content is just a normal View tree with normal flexbox
// sizing, so `card` below is guaranteed to be exactly
// `screen height - 2*MARGIN` tall, no more, no less, and ChatView's own
// internal flex layout (which is what makes its message list scroll and its
// input bar dock to the bottom) works exactly as it did before this screen
// was ever wrapped in anything.
const ChatRoomModal = forwardRef<ChatRoomModalRef, ChatRoomModalProps>(
  ({ currentUserId, onGroupDeleted }, ref) => {
    const [visible, setVisible] = useState(false);
    const [group, setGroup] = useState<ChatGroup | null>(null);
    const [view, setView] = useState<"messages" | "info">("messages");
    const [isUploading, setIsUploading] = useState(false);

    // `onDismiss` (Modal's built-in "closed" callback) is iOS-only, so reset
    // state here instead — this fires on every close path (X button,
    // Android back, group deleted, or the imperative ref) on both platforms.
    const handleClose = useCallback(() => {
      setVisible(false);
      setGroup(null);
      setView("messages");
      setIsUploading(false);
    }, []);

    useImperativeHandle(ref, () => ({
      open: (targetGroup: ChatGroup) => {
        setGroup(targetGroup);
        setView("messages");
        setVisible(true);
      },
      close: handleClose,
    }));

    // Android hardware back — RN's Modal intercepts this itself and calls
    // onRequestClose directly (it doesn't go through the shared JS
    // BackHandler stack), so this is the single place that needs to decide
    // "info -> back to messages" vs. "block while uploading" vs. "close".
    const handleBackButtonPress = useCallback(() => {
      if (view === "info") {
        setView("messages");
        return;
      }
      if (isUploading) {
        Alert.alert("Upload in Progress", "Please wait for the upload to complete.");
        return;
      }
      handleClose();
    }, [view, isUploading, handleClose]);

    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleBackButtonPress}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            {group && view === "messages" && (
              <ChatView
                group={group}
                onBack={handleClose}
                onInfoPress={() => setView("info")}
                onUploadStateChange={setIsUploading}
                extraTopOffset={MARGIN}
              />
            )}
            {group && view === "info" && (
              <GroupInfoScreen
                chat={group}
                onBack={() => setView("messages")}
                onUpdateGroup={(updated) => setGroup(updated)}
                onDeleteGroup={(groupId) => {
                  handleClose();
                  onGroupDeleted(groupId);
                }}
                currentUserId={currentUserId}
              />
            )}
          </View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  card: {
    flex: 1,
    margin: MARGIN,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
});

export default ChatRoomModal;
