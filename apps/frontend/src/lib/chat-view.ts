import { Chat, ChatMember, Message, User } from '@/lib/types';

export function getChatDisplayName(chat: Chat, currentUserId: string): string {
  if (chat.type === 'GROUP') {
    return chat.name?.trim() || 'Group chat';
  }

  const otherMember = chat.members.find((member) => member.user.id !== currentUserId);
  return otherMember?.user.name || otherMember?.user.email || 'Direct chat';
}

export function getChatSubtitle(chat: Chat, currentUserId: string): string {
  if (chat.type === 'GROUP') {
    return `${chat.members.length} participants`;
  }

  const otherMember = chat.members.find((member) => member.user.id !== currentUserId);
  return otherMember?.user.email || 'Direct conversation';
}

export function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

export function resolveMessageAuthor(
  message: Message,
  members: ChatMember[],
  currentUser: User,
): string {
  if (message.senderId === currentUser.id) {
    return 'You';
  }

  const member = members.find((item) => item.user.id === message.senderId);
  return member?.user.name || member?.user.email || `User #${message.senderId}`;
}
