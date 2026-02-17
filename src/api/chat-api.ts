import { apiServer1 } from "./api-server-1";
import { ChatGroup, ChatMember, ChatMessage, MessageReceipt, User } from "../components/notifications/chat/ChatTypes";

export interface GetChatThreadsRequest {
  page?: number;
  per_page?: number;
  search?: string;
  type?: "direct" | "group" | "all";
}

export interface GetChatThreadsResponse {
  success: boolean;
  message: string;
  data: {
    threads: ChatGroup[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
      has_more: boolean;
    };
  };
}

export interface GetChatMessagesRequest {
  chat_group_id: string | number;
  page?: number;
  per_page?: number;
}

export interface GetChatMessagesResponse {
  success: boolean;
  message: string;
  data: {
    messages: ChatMessage[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
      has_more: boolean;
    };
  };
}

export interface SendMessageRequest {
  chat_group_id: string | number;
  type: "text" | "image" | "file";
  content?: string;
  attachment?: any;
  attachment_url?: string;
  metadata?: Record<string, any>;
}

export interface SendMessageResponse {
  success: boolean;
  message: string;
  data: {
    message: ChatMessage;
  };
}

export interface CreateChatGroupRequest {
  name?: string;
  type: "direct" | "group";
  user_ids?: (string | number)[];
  avatar_url?: string;
  category?: string;
  grade_level_id?: number | null;
  grade_level_class_id?: number | null;
  student_ids?: number[];
}

export interface MarkAsReadRequest {
  chat_group_id: string | number;
}

export interface UpdateMessageRequest {
  message_id: string | number;
  content: string;
}

export interface DeleteMessageRequest {
  message_id: string | number;
}

export interface GetMessageReadReceiptsRequest {
  message_id: string | number;
}

export interface InitUploadRequest {
  filename: string;
  total_size: number;
  mime_type?: string;
}

export interface ChunkUploadRequest {
  upload_id: string | number;
  chunk: any;
  offset: number;
}

export interface FinishUploadRequest {
  upload_id: string | number;
}

export interface UpdateChatGroupRequest {
  chat_group_id: string | number;
  name?: string;
  avatar_url?: string;
  is_disabled?: boolean;
}

export interface AddChatGroupMembersRequest {
  chat_group_id: string | number;
  user_ids: (string | number)[];
}

export interface RemoveChatGroupMemberRequest {
  chat_group_id: string | number;
  user_id: string | number;
}

export interface GetChatGroupMembersRequest {
  chat_group_id: string | number;
}

export interface DeleteChatGroupRequest {
  chat_group_id: string | number;
}

export interface TogglePinRequest {
  chat_group_id: string | number;
}

export interface SearchChatUsersRequest {
  query?: string;
  filter?: "all" | "teacher" | "student" | "parent" | "management";
  chat_group_id?: string | number;
  per_page?: number;
  page?: number;
}

export interface ToggleMessageReactionRequest {
  message_id: string | number;
  emoji: string;
}

export interface SearchChatUsersResponse {
  success: boolean;
  message: string;
  data: {
    data: User[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface GetChatGroupMembersRequest {
  chat_group_id: string | number;
  page?: number;
  per_page?: number;
}

export interface GetChatGroupMembersResponse {
  success: boolean;
  message: string;
  data: {
    members: ChatMember[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
      has_more: boolean;
    };
  };
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data: {
    upload_id: string | number;
    status: string;
    uploaded_size?: number;
    total_size?: number;
    media?: any;
  };
}

export interface GetMessageReadReceiptsResponse {
  success: boolean;
  message: string;
  data: {
    message_id: string | number;
    read_by: MessageReceipt[];
  };
}

export const chatApi = apiServer1.injectEndpoints({
  endpoints: (builder) => ({
    getChatThreads: builder.query<GetChatThreadsResponse, GetChatThreadsRequest>({
      query: (params) => ({
        url: "api/communication-management/chats/threads",
        method: "POST",
        body: params,
      }),
      providesTags: ["ChatThreads"],
    }),

    getChatMessages: builder.query<GetChatMessagesResponse, GetChatMessagesRequest>({
      query: (params) => ({
        url: "api/communication-management/chats/messages",
        method: "POST",
        body: params,
      }),
      // Cache by chat_group_id only to allow merging paginated results
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        return `${endpointName}-${queryArgs.chat_group_id}`;
      },
      // Merge results when page changes
      merge: (currentCache, newItems, { arg }) => {
        // If it's page 1, it might be a refresh or polling
        if (arg.page === 1 || !arg.page) {
          // If we have newer messages in the new batch that aren't in currentCache, 
          // we might want to be careful. But for simplicity, if it's page 1, we often 
          // just want to ensure we have the latest.
          // However, if we just want to ADD new messages from polling:
          const existingIds = new Set(currentCache.data.messages.map(m => m.id));
          const newMessages = newItems.data.messages.filter(m => !existingIds.has(m.id));
          
          if (newMessages.length > 0) {
            // Prepend new messages (they are newest)
            currentCache.data.messages.unshift(...newMessages);
          }
          
          // Update pagination info from the latest fetch (usually page 1)
          currentCache.data.pagination = newItems.data.pagination;
        } else {
          // It's a "load more" (older messages)
          // Avoid duplicates
          const existingIds = new Set(currentCache.data.messages.map(m => m.id));
          const olderMessages = newItems.data.messages.filter(m => !existingIds.has(m.id));
          
          currentCache.data.messages.push(...olderMessages);
          currentCache.data.pagination = newItems.data.pagination;
        }
      },
      // Always allow refetching for the first page
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.page !== previousArg?.page || currentArg?.page === 1;
      },
      providesTags: (result, error, arg) => [
        { type: "ChatMessages", id: arg.chat_group_id },
      ],
    }),

    sendChatMessage: builder.mutation<SendMessageResponse, SendMessageRequest>({
      query: (data) => {
        // Handle file upload if needed
        if (data.type !== "text" && data.attachment) {
          const formData = new FormData();
          formData.append("chat_group_id", data.chat_group_id.toString());
          formData.append("type", data.type);
          if (data.content) formData.append("content", data.content);
          formData.append("attachment", data.attachment);
          if (data.metadata) formData.append("metadata", JSON.stringify(data.metadata));

          return {
            url: "api/communication-management/chats/send",
            method: "POST",
            body: formData,
          };
        }

        return {
          url: "api/communication-management/chats/send",
          method: "POST",
          body: data,
        };
      },
      invalidatesTags: (result, error, arg) => [
        "ChatThreads",
        { type: "ChatMessages", id: arg.chat_group_id },
      ],
    }),

    createNewChatGroup: builder.mutation<any, CreateChatGroupRequest>({
      query: (data) => ({
        url: "api/communication-management/chats/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ChatThreads"],
    }),

    markChatAsRead: builder.mutation<any, MarkAsReadRequest>({
      query: (data) => ({
        url: "api/communication-management/chats/mark-read",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ChatThreads"],
    }),

    updateChatMessage: builder.mutation<any, UpdateMessageRequest>({
      query: (data) => ({
        url: "api/communication-management/chats/messages/update",
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, arg) => ["ChatThreads", "ChatMessages"],
    }),

    deleteChatMessage: builder.mutation<any, DeleteMessageRequest>({
      query: (data) => ({
        url: "api/communication-management/chats/messages/delete",
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, arg) => ["ChatThreads", "ChatMessages"],
    }),

    getMessageReadReceipts: builder.query<GetMessageReadReceiptsResponse, GetMessageReadReceiptsRequest>({
      query: (params) => ({
        url: "api/communication-management/chats/messages/receipts",
        method: "POST",
        body: params,
      }),
    }),

    initChunkedUpload: builder.mutation<UploadResponse, InitUploadRequest>({
      query: (data) => ({
        url: "api/communication-management/chats/media/uploads/init",
        method: "POST",
        body: data,
      }),
    }),

    pushUploadChunk: builder.mutation<UploadResponse, ChunkUploadRequest>({
      query: (data) => {
        const formData = new FormData();
        formData.append("upload_id", data.upload_id.toString());
        formData.append("chunk", data.chunk);
        formData.append("offset", data.offset.toString());

        return {
          url: "api/communication-management/chats/media/uploads/push",
          method: "POST",
          body: formData,
        };
      },
    }),

    finishChunkedUpload: builder.mutation<UploadResponse, FinishUploadRequest>({
      query: (data) => ({
        url: "api/communication-management/chats/media/uploads/finish",
        method: "POST",
        body: data,
      }),
    }),

    updateChatGroup: builder.mutation<any, UpdateChatGroupRequest>({
      query: (data) => ({
        url: "api/communication-management/chats/update-group",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ChatThreads"],
    }),

    addChatGroupMembers: builder.mutation<any, AddChatGroupMembersRequest>({
      query: (data) => ({
        url: "api/communication-management/chats/add-members",
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, arg) => [
        "ChatThreads",
        { type: "ChatMembers", id: arg.chat_group_id },
      ],
    }),

    removeChatGroupMember: builder.mutation<any, RemoveChatGroupMemberRequest>({
      query: (data) => ({
        url: "api/communication-management/chats/remove-member",
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, arg) => [
        "ChatThreads",
        { type: "ChatMembers", id: arg.chat_group_id },
      ],
    }),

    getChatGroupMembers: builder.query<GetChatGroupMembersResponse, GetChatGroupMembersRequest>({
      query: (params) => ({
        url: "api/communication-management/chats/members",
        method: "POST",
        body: params,
      }),
      // Serialize only by chat_group_id to share cache across pages
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        return `${endpointName}-${queryArgs.chat_group_id}`;
      },
      // Merge results when page changes
      merge: (currentCache, newItems) => {
        if (newItems.data.pagination.current_page === 1) {
          return newItems;
        }
        currentCache.data.members.push(...newItems.data.members);
        currentCache.data.pagination = newItems.data.pagination;
      },
      // Always allow refetching for the first page
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.page !== previousArg?.page;
      },
      providesTags: (result, error, arg) => [
        { type: "ChatMembers", id: arg.chat_group_id },
      ],
    }),

    deleteChatGroup: builder.mutation<any, DeleteChatGroupRequest>({
      query: (data) => ({
        url: "api/communication-management/chats/delete-group",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ChatThreads"],
    }),

    searchChatUsers: builder.query<SearchChatUsersResponse, SearchChatUsersRequest>({
      query: (params) => ({
        url: "api/communication-management/chats/search-users",
        method: "POST",
        body: params,
      }),
    }),

    toggleChatGroupPin: builder.mutation<any, TogglePinRequest>({
      query: (data) => ({
        url: "api/communication-management/chats/toggle-pin",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ChatThreads"],
    }),

    reactToMessage: builder.mutation<any, ToggleMessageReactionRequest>({
      query: (data) => ({
        url: "api/communication-management/chats/messages/react",
        method: "POST",
        body: data,
      }),
      // We don't necessarily need to invalidate ChatMessages if we use real-time updates,
      // but adding it here as a fallback for the local user.
      invalidatesTags: (result, error, arg) => ["ChatMessages"],
    }),
    setChatFocus: builder.mutation<any, { chat_group_id: number | null }>({
      query: (payload) => ({
        url: "/chats/focus",
        method: "POST",
        body: payload,
      }),
    }),
  }),
});

export const {
  useGetChatThreadsQuery,
  useGetChatMessagesQuery,
  useSendChatMessageMutation,
  useCreateNewChatGroupMutation,
  useMarkChatAsReadMutation,
  useUpdateChatMessageMutation,
  useDeleteChatMessageMutation,
  useGetMessageReadReceiptsQuery,
  useInitChunkedUploadMutation,
  usePushUploadChunkMutation,
  useFinishChunkedUploadMutation,
  useUpdateChatGroupMutation,
  useAddChatGroupMembersMutation,
  useRemoveChatGroupMemberMutation,
  useGetChatGroupMembersQuery,
  useDeleteChatGroupMutation,
  useSearchChatUsersQuery,
  useToggleChatGroupPinMutation,
  useReactToMessageMutation,
  useSetChatFocusMutation,
} = chatApi;
