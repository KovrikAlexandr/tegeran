'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { ChatInfoPanel } from '@/components/chat-info-panel';
import { MessageList } from '@/components/message-list';
import { ProtectedView } from '@/components/protected-view';
import { getChatDisplayName, getChatSubtitle } from '@/lib/chat-view';
import { useAuth } from '@/lib/auth/auth-context';
import { loadChatPageData } from '@/lib/services/chat-service';
import { sendMessage, subscribeToMessages } from '@/lib/services/message-service';
import { ChatPageData } from '@/lib/types';

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const [data, setData] = useState<ChatPageData | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const chatId = useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  useEffect(() => {
    if (!token || !chatId) {
      return;
    }

    const activeToken = token;
    const activeChatId = chatId;
    let isActive = true;

    async function load(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const nextData = await loadChatPageData(activeToken, activeChatId);

        if (isActive) {
          setData(nextData);
        }
      } catch (loadError) {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load chat');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void load();
    const unsubscribe = subscribeToMessages(activeChatId, () => {
      void load();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [chatId, token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!token || !chatId || !draft.trim()) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await sendMessage(token, chatId, draft.trim());
      setDraft('');
      const nextData = await loadChatPageData(token, chatId);
      setData(nextData);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : 'Message was not sent',
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <ProtectedView>
      <main className="page-shell page-shell-wide">
        <section className="page-header">
          <div>
            <p className="eyebrow">Conversation</p>
            <h1>{data ? getChatDisplayName(data.chat, data.me.id) : 'Loading chat...'}</h1>
            <p className="muted">
              {data ? getChatSubtitle(data.chat, data.me.id) : 'Fetching messages and participants'}
            </p>
          </div>
          <Link className="secondary-link" href="/chats">
            Back to chats
          </Link>
        </section>

        {error ? <p className="status-error">{error}</p> : null}

        {isLoading || !data ? (
          <section className="status-card">
            <p className="eyebrow">Loading</p>
            <h2>Pulling the chat from GraphQL-BFF</h2>
          </section>
        ) : (
          <section className="chat-layout">
            <div className="chat-main-column">
              <MessageList chat={data.chat} currentUser={data.me} messages={data.messages.items} />

              <form className="panel composer" onSubmit={handleSubmit}>
                <label className="field">
                  <span>New message</span>
                  <textarea
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write something useful..."
                    required
                    rows={4}
                    value={draft}
                  />
                </label>
                <div className="composer-actions">
                  <button className="secondary-button" onClick={() => window.location.reload()} type="button">
                    Reload chat
                  </button>
                  <button className="primary-button" disabled={isSending || !draft.trim()} type="submit">
                    {isSending ? 'Sending...' : 'Send message'}
                  </button>
                </div>
              </form>
            </div>

            <ChatInfoPanel chat={data.chat} currentUser={data.me} />
          </section>
        )}
      </main>
    </ProtectedView>
  );
}
