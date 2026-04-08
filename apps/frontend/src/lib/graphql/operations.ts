export const REGISTER_MUTATION = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      id
      name
      email
      authSubject
    }
  }
`;

export const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      tokenType
      expiresIn
    }
  }
`;

export const CHATS_PAGE_QUERY = `
  query ChatsPageData {
    me {
      id
      authSubject
      name
      email
    }
    chats {
      id
      name
      type
      lastMessage {
        content
        createdAt
      }
      members {
        id
        chatId
        userId
        role
        user {
          id
          authSubject
          name
          email
        }
      }
    }
  }
`;

export const CHAT_PAGE_QUERY = `
  query ChatPageData($chatId: ID!, $limit: Int!) {
    me {
      id
      authSubject
      name
      email
    }
    chat(id: $chatId) {
      id
      name
      type
      lastMessage {
        content
        createdAt
      }
      members {
        id
        chatId
        userId
        role
        user {
          id
          authSubject
          name
          email
        }
      }
    }
    messages(chatId: $chatId, limit: $limit) {
      items {
        id
        content
        senderId
        chatId
        createdAt
      }
      nextCursor
      hasMore
    }
  }
`;

export const GET_OR_CREATE_DIRECT_CHAT_MUTATION = `
  mutation GetOrCreateDirectChat($input: GetOrCreateDirectChatInput!) {
    getOrCreateDirectChat(input: $input) {
      id
      name
      type
      lastMessage {
        content
        createdAt
      }
      members {
        id
        chatId
        userId
        role
        user {
          id
          authSubject
          name
          email
        }
      }
    }
  }
`;

export const CREATE_GROUP_CHAT_MUTATION = `
  mutation CreateGroupChat($input: CreateGroupChatInput!) {
    createGroupChat(input: $input) {
      id
      name
      type
      lastMessage {
        content
        createdAt
      }
      members {
        id
        chatId
        userId
        role
        user {
          id
          authSubject
          name
          email
        }
      }
    }
  }
`;

export const SEND_MESSAGE_MUTATION = `
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      id
      content
      senderId
      chatId
      createdAt
    }
  }
`;
