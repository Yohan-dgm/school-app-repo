import { createSlice } from "@reduxjs/toolkit";
import { chatApi } from "../../api/chat-api";
import { ChatGroup, ChatMessage } from "../../components/notifications/chat/ChatTypes";

// Slim, persisted snapshot of chat threads + each group's most recent
// messages. Populated automatically whenever the underlying RTK Query chat
// endpoints resolve (see extraReducers below) — chat-api.ts itself is
// untouched. Read by ChatListView/ChatView for an instant first paint on
// cold start, while RTK Query's real network fetch runs in the background
// and reconciles. Text-only, capped per group, so the persisted footprint
// stays small.

const MAX_MESSAGES_PER_GROUP = 30;

interface ChatCacheState {
  threads: ChatGroup[];
  messagesByGroup: Record<string, ChatMessage[]>;
}

const initialState: ChatCacheState = {
  threads: [],
  messagesByGroup: {},
};

const chatCacheSlice = createSlice({
  name: "chatCache",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addMatcher(chatApi.endpoints.getChatThreads.matchFulfilled, (state, action) => {
      const threads = action.payload?.data?.threads;
      if (threads) {
        state.threads = threads;
      }
    });

    builder.addMatcher(chatApi.endpoints.getChatMessages.matchFulfilled, (state, action) => {
      // Only cache the first page — that's what's needed for an instant
      // first paint when a chat is (re)opened.
      if (action.meta.arg.originalArgs.page && action.meta.arg.originalArgs.page !== 1) return;

      const groupId = String(action.meta.arg.originalArgs.chat_group_id);
      const messages = action.payload?.data?.messages;
      if (messages) {
        state.messagesByGroup[groupId] = messages.slice(0, MAX_MESSAGES_PER_GROUP);
      }
    });
  },
});

export default chatCacheSlice.reducer;
