export type MessageType = "text" | "image" | "file" | "system";

export interface ChatMessage {
  id: string | number;
  chatGroupId?: string | number;
  chat_group_id?: string | number;
  user_id?: string | number; // Backend uses user_id
  sender_id?: string | number; // For consistency
  sender_name: string;
  sender_role?: string; // admin or member
  type: MessageType;
  content: string;
  attachment_url?: string;
  metadata?: {
    original_filename?: string;
    size?: number;
    mime_type?: string;
    width?: number;
    height?: number;
    [key: string]: any;
  };
  created_at: string;
  timestamp: string;
  is_read?: boolean;
  read_at?: string;
  read_count?: number;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  count: number;
  user_ids: (string | number)[];
}

export type GroupCategory = 
  | "all" 
  | "educator" 
  | "management" 
  | "grade_level" 
  | "class" 
  | "student";

export type UserRole = "admin" | "teacher" | "student" | "parent";

export interface ChatMember {
  id: string | number;
  name: string;
  avatar?: string;
  role: UserRole | string;
  is_active?: boolean;
  joined_at?: string;
}

export interface ChatGroup {
  id: string | number;
  name: string;
  description?: string;
  type: "direct" | "group" | "system";
  avatar_url?: string;
  last_message?: ChatMessage | null;
  unread_count: number;
  current_user_role?: 'admin' | 'member';
  created_by?: string | number;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
  members_count?: number;
  is_disabled?: boolean;
  only_admins_can_message?: boolean;
  is_pinned?: boolean;
  members?: ChatMember[];
}

export interface MessageReceipt {
  user_id: string | number;
  user_name: string;
  user_avatar?: string;
  read_at: string;
}

export interface User {
  id: string | number;
  name: string;
  avatar?: string;
  role?: UserRole | string;
  is_member?: boolean;
}
