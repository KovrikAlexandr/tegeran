import { formatTimestamp, resolveMessageAuthor } from '@/lib/chat-view';
import { Chat, Message, User } from '@/lib/types';

interface MessageListProps {
  chat: Chat;
  currentUser: User;
  messages: Message[];
}

export function MessageList({ chat, currentUser, messages }: MessageListProps) {
  if (!messages.length) {
    return (
      <div className="panel empty-messages">
        <p className="eyebrow">No messages yet</p>
        <h2>Start the conversation</h2>
        <p className="muted">Your next message will appear here.</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => {
        const isOwn = message.senderId === currentUser.id;

        return (
          <article
            key={message.id}
            className={`message-card ${isOwn ? 'message-card-own' : ''}`}
          >
            <p className="message-author">{resolveMessageAuthor(message, chat.members, currentUser)}</p>
            <p>{message.content}</p>
            <p className="message-time">{formatTimestamp(message.createdAt)}</p>
          </article>
        );
      })}
    </div>
  );
}
