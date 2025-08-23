# MongoDB Integration Setup Guide

This guide explains how to set up and use MongoDB for chat history persistence in the ChatGPT application.

## Prerequisites

1. **MongoDB Installation**
   - **Local MongoDB**: Install MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
   - **MongoDB Atlas**: Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)

2. **Node.js Dependencies**
   ```bash
   pnpm add mongoose
   ```

## Environment Configuration

Add your MongoDB connection string to `.env.local`:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/chatgpt
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatgpt
```

## Database Schema

### Collections

1. **chats** - Stores chat conversations
   - `id`: Unique chat identifier
   - `userId`: Clerk user ID
   - `title`: Chat title
   - `messages`: Array of message objects
   - `createdAt`: Creation timestamp
   - `updatedAt`: Last modification timestamp
   - `isArchived`: Archive status
   - `tags`: Array of tags
   - `metadata`: Additional metadata

### Message Structure

Each message in the `messages` array contains:
- `id`: Unique message identifier
- `role`: 'user' | 'assistant' | 'system'
- `content`: Message content
- `timestamp`: Message timestamp
- `metadata`: Additional message metadata

## API Endpoints

### Chat Management

- `GET /api/chats` - Get user's chat history
- `POST /api/chats` - Create a new chat
- `GET /api/chats/[chatId]` - Get specific chat
- `PUT /api/chats/[chatId]` - Update chat (title, archive status)
- `DELETE /api/chats/[chatId]` - Delete chat

### Message Management

- `POST /api/chats/[chatId]/messages` - Add message to chat

### Search & Statistics

- `GET /api/chats/search` - Search chats by content
- `GET /api/chats/stats` - Get user's chat statistics

## Usage Examples

### Using the Chat History Hook

```typescript
import { useChatHistory } from '@/hooks/use-chat-history'

function ChatSidebar() {
  const {
    chatHistory,
    isLoading,
    error,
    createNewChat,
    deleteChat,
    updateChatTitle,
    searchChats,
  } = useChatHistory()

  const handleNewChat = async () => {
    const chatId = await createNewChat({
      title: 'New Conversation',
      initialMessage: {
        role: 'user',
        content: 'Hello!'
      }
    })
    console.log('Created chat:', chatId)
  }

  // ... rest of component
}
```

### Using the Active Chat Hook

```typescript
import { useActiveChat } from '@/hooks/use-active-chat'

function ChatInterface({ chatId }: { chatId: string }) {
  const {
    activeChat,
    isLoading,
    addMessage,
    updateTitle,
  } = useActiveChat(chatId)

  const handleSendMessage = async (content: string) => {
    await addMessage('user', content)
    // Add AI response logic here
    await addMessage('assistant', 'AI response...')
  }

  // ... rest of component
}
```

## Testing

Run the MongoDB integration test:

```bash
node scripts/test-mongodb.js
```

This will test all CRUD operations and ensure the database connection is working properly.

## Features Implemented

✅ **Chat History Persistence**
- All chat conversations are saved to MongoDB
- Real-time updates when messages are added
- Automatic title generation from first user message

✅ **Search Functionality**
- Full-text search across chat titles and message content
- Indexed for optimal performance

✅ **User Isolation**
- Each user's chats are isolated using Clerk user IDs
- Secure API endpoints with authentication

✅ **Archive System**
- Archive/unarchive chats
- Filter archived chats in history

✅ **Performance Optimizations**
- Database indexes for common queries
- Pagination support for large chat histories
- Optimistic updates for better UX

✅ **Statistics**
- Track total chats, messages, and usage patterns
- Average messages per chat calculation

## Migration from Hardcoded Data

The old hardcoded chat history has been replaced with MongoDB integration:

**Before:**
```typescript
const defaultChatHistory = [
  { id: '1', title: 'Plan mode in Claude Code', timestamp: new Date('2024-01-15') },
  // ... more hardcoded data
]
```

**After:**
```typescript
// Data is now fetched from MongoDB via API calls
const { chatHistory, isLoading } = useChatHistory()
```

## Troubleshooting

### Connection Issues

1. **Local MongoDB not running**
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl start mongod
   ```

2. **Connection string format**
   - Local: `mongodb://localhost:27017/chatgpt`
   - Atlas: `mongodb+srv://username:password@cluster.mongodb.net/chatgpt`

3. **Authentication errors**
   - Ensure Clerk authentication is working
   - Check that `CLERK_SECRET_KEY` is set correctly

### Performance Issues

1. **Slow queries**
   - Check that indexes are created (they're created automatically)
   - Monitor query patterns in MongoDB Compass

2. **Large chat histories**
   - Use pagination parameters (`limit`, `offset`)
   - Consider archiving old chats

## Next Steps

- [ ] Implement chat folders/categories
- [ ] Add chat templates and snippets
- [ ] Implement export/import functionality
- [ ] Add real-time collaborative features
- [ ] Implement advanced search filters