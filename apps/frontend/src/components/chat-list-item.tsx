import Link from 'next/link';

import { formatTimestamp, getChatDisplayName, getChatSubtitle } from '@/lib/chat-view';
import { Chat, User } from '@/lib/types';

interface ChatListItemProps {
  chat: Chat;
  currentUser: User;
}

export function ChatListItem({ chat, currentUser }: ChatListItemProps) {
  return (
    <Link className="chat-card" href={`/chat/${chat.id}`}>
      <div className="chat-card-header">
        <div>
          <p className="chat-card-title">{getChatDisplayName(chat, currentUser.id)}</p>
          <p className="chat-card-subtitle">{getChatSubtitle(chat, currentUser.id)}</p>
        </div>
        <span className={`chat-type chat-type-${chat.type.toLowerCase()}`}>{chat.type}</span>
      </div>
      <div className="chat-card-body">
        {chat.lastMessage ? (
          <>
            <p>{chat.lastMessage.content}</p>
            <p className="muted">Last message: {formatTimestamp(chat.lastMessage.createdAt)}</p>
          </>
        ) : (
          <p className="muted">No messages yet. Open the chat to start the conversation.</p>
        )}
      </div>
    </Link>
  );
}
