import { getChatDisplayName } from '@/lib/chat-view';
import { Chat, User } from '@/lib/types';

interface ChatInfoPanelProps {
  chat: Chat;
  currentUser: User;
}

export function ChatInfoPanel({ chat, currentUser }: ChatInfoPanelProps) {
  return (
    <aside className="panel">
      <p className="eyebrow">Chat details</p>
      <h2>{getChatDisplayName(chat, currentUser.id)}</h2>
      <dl className="details-grid">
        <div>
          <dt>Type</dt>
          <dd>{chat.type}</dd>
        </div>
        <div>
          <dt>Participants</dt>
          <dd>{chat.members.length}</dd>
        </div>
      </dl>

      <div className="member-list">
        {chat.members.map((member) => (
          <div key={member.id} className="member-card">
            <div>
              <p className="member-name">{member.user.name}</p>
              <p className="muted">{member.user.email}</p>
            </div>
            <span className={`role-badge role-${member.role.toLowerCase()}`}>{member.role}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
