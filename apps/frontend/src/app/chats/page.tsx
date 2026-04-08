'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { ChatListItem } from '@/components/chat-list-item';
import { ProtectedView } from '@/components/protected-view';
import { useAuth } from '@/lib/auth/auth-context';
import { isAuthSessionError } from '@/lib/auth/session-expiration';
import { parseEmailList } from '@/lib/parse-email-list';
import { createGroupChat, getOrCreateDirectChat, loadChatsPageData } from '@/lib/services/chat-service';
import { ChatsPageData } from '@/lib/types';

export default function ChatsPage() {
  const router = useRouter();
  const { logout, token } = useAuth();
  const [data, setData] = useState<ChatsPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [directEmail, setDirectEmail] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMembersInput, setGroupMembersInput] = useState('');
  const [directError, setDirectError] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [isOpeningDirectChat, setIsOpeningDirectChat] = useState(false);
  const [isCreatingGroupChat, setIsCreatingGroupChat] = useState(false);
  const [activeForm, setActiveForm] = useState<'direct' | 'group' | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const activeToken = token;
    let isActive = true;

    async function run(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const nextData = await loadChatsPageData(activeToken);

        if (isActive) {
          setData(nextData);
        }
      } catch (loadError) {
        if (isAuthSessionError(loadError)) {
          return;
        }

        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load chats');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void run();

    return () => {
      isActive = false;
    };
  }, [token]);

  async function refreshChats(): Promise<void> {
    if (!token) {
      return;
    }

    setError(null);

    try {
      const nextData = await loadChatsPageData(token);
      setData(nextData);
    } catch (loadError) {
      if (isAuthSessionError(loadError)) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : 'Failed to load chats');
    }
  }

  function closeForms(): void {
    setActiveForm(null);
    setDirectError(null);
    setGroupError(null);
  }

  async function handleDirectChatSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!token) {
      return;
    }

    setDirectError(null);
    setIsOpeningDirectChat(true);

    try {
      const chat = await getOrCreateDirectChat(token, directEmail.trim());
      setDirectEmail('');
      closeForms();
      router.push(`/chat/${chat.id}`);
    } catch (submissionError) {
      if (isAuthSessionError(submissionError)) {
        return;
      }

      setDirectError(
        submissionError instanceof Error ? submissionError.message : 'Could not open direct chat',
      );
    } finally {
      setIsOpeningDirectChat(false);
    }
  }

  async function handleGroupChatSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!token) {
      return;
    }

    const memberEmails = parseEmailList(groupMembersInput);

    if (!memberEmails.length) {
      setGroupError('Enter at least one participant email.');
      return;
    }

    setGroupError(null);
    setIsCreatingGroupChat(true);

    try {
      const chat = await createGroupChat(token, {
        name: groupName.trim(),
        memberEmails,
      });

      setGroupName('');
      setGroupMembersInput('');
      closeForms();
      router.push(`/chat/${chat.id}`);
    } catch (submissionError) {
      if (isAuthSessionError(submissionError)) {
        return;
      }

      setGroupError(
        submissionError instanceof Error ? submissionError.message : 'Could not create group chat',
      );
    } finally {
      setIsCreatingGroupChat(false);
    }
  }

  return (
    <ProtectedView>
      <main className="page-shell">
        <section className="page-header">
          <div>
            <p className="eyebrow">Your workspace</p>
            <h1>Chats</h1>
            {data ? <p className="muted">{data.me.name}</p> : null}
          </div>

          <div className="header-actions">
            <button
              className="secondary-button secondary-button-small"
              onClick={() => {
                setDirectError(null);
                setActiveForm((current) => (current === 'direct' ? null : 'direct'));
                setGroupError(null);
              }}
              type="button"
            >
              Open by email
            </button>
            <button
              className="secondary-button secondary-button-small"
              onClick={() => {
                setGroupError(null);
                setActiveForm((current) => (current === 'group' ? null : 'group'));
                setDirectError(null);
              }}
              type="button"
            >
              Create group
            </button>
            <button className="secondary-button" onClick={() => void refreshChats()} type="button">
              Refresh
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
              type="button"
            >
              Logout
            </button>
          </div>
        </section>

        {error ? <p className="status-error">{error}</p> : null}

        {isLoading ? (
          <section className="status-card">
            <p className="eyebrow">Loading</p>
            <h2>Loading chats</h2>
          </section>
        ) : null}

        {activeForm === 'direct' ? (
          <section className="panel inline-action-panel">
            <form className="action-form" onSubmit={handleDirectChatSubmit}>
              <p className="eyebrow">Direct chat</p>
              <label className="field">
                <span>Email</span>
                <input
                  onChange={(event) => setDirectEmail(event.target.value)}
                  placeholder="name@example.com"
                  required
                  type="email"
                  value={directEmail}
                />
              </label>
              {directError ? <p className="status-error">{directError}</p> : null}
              <div className="header-actions">
                <button
                  className="primary-button"
                  disabled={isOpeningDirectChat || !directEmail.trim()}
                  type="submit"
                >
                  {isOpeningDirectChat ? 'Opening...' : 'Open chat'}
                </button>
                <button className="secondary-button" onClick={closeForms} type="button">
                  Cancel
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {activeForm === 'group' ? (
          <section className="panel inline-action-panel">
            <form className="action-form" onSubmit={handleGroupChatSubmit}>
              <p className="eyebrow">Group chat</p>
              <label className="field">
                <span>Chat name</span>
                <input
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Project team"
                  required
                  value={groupName}
                />
              </label>
              <label className="field">
                <span>Participants</span>
                <textarea
                  onChange={(event) => setGroupMembersInput(event.target.value)}
                  placeholder="bob@example.com, charlie@example.com"
                  required
                  rows={4}
                  value={groupMembersInput}
                />
              </label>
              {groupError ? <p className="status-error">{groupError}</p> : null}
              <div className="header-actions">
                <button
                  className="primary-button"
                  disabled={isCreatingGroupChat || !groupName.trim() || !groupMembersInput.trim()}
                  type="submit"
                >
                  {isCreatingGroupChat ? 'Creating...' : 'Create chat'}
                </button>
                <button className="secondary-button" onClick={closeForms} type="button">
                  Cancel
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {!isLoading && data && !data.chats.length ? (
          <section className="status-card">
            <p className="eyebrow">No chats yet</p>
            <h2>Your list is empty</h2>
          </section>
        ) : null}

        {!isLoading && data?.chats.length ? (
          <section className="chat-list">
            {data.chats.map((chat) => (
              <ChatListItem chat={chat} currentUser={data.me} key={chat.id} />
            ))}
          </section>
        ) : null}
      </main>
    </ProtectedView>
  );
}
