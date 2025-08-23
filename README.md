# ChatGPT Clone

A modern, feature-rich ChatGPT clone built with Next.js, featuring real-time chat with AI models, persistent chat history, memory management, and image generation capabilities.

## 🚀 Features

### Core Chat Features
- **Real-time AI Chat**: Interactive chat interface with Google's Gemini AI models
- **Persistent Chat History**: MongoDB-based storage with full CRUD operations
- **Memory Management**: Context-aware conversations using Mem0 AI memory system
- **Image Generation**: AI-powered image generation with Cloudinary integration
- **File Upload**: Support for various file types with processing capabilities

### User Experience
- **Authentication**: Secure user authentication with Clerk
- **Responsive Design**: Mobile-friendly interface that adapts to all screen sizes
- **Dark Theme**: Modern dark theme with smooth animations
- **Real-time Streaming**: Live message streaming for immediate responses
- **Search Functionality**: Full-text search across chat history
- **Keyboard Shortcuts**: Productivity-focused shortcuts (Ctrl+B, Ctrl+K, Ctrl+N, Esc)

### Technical Features
- **Modern UI**: Built with Radix UI components and Tailwind CSS
- **Error Boundaries**: Robust error handling with retry functionality
- **Session Management**: Both authenticated and anonymous user support
- **Performance Optimized**: Lazy loading, pagination, and efficient data fetching

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS with custom animations
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Typography**: Geist Sans & Mono fonts

### Backend
- **API Routes**: Next.js API routes
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Clerk
- **AI Integration**: Google Gemini API via AI SDK
- **Memory**: Mem0 AI for context management
- **Image Storage**: Cloudinary
- **File Processing**: Built-in file upload handling

### Development
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Code Quality**: ESLint with Next.js configuration
- **Build System**: Next.js with optimized production builds

## 📁 Project Structure

```
chatgpt/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── chat/                 # Chat API with streaming
│   │   ├── chats/                # Chat management (CRUD)
│   │   ├── images/               # Image generation
│   │   ├── memory/               # Memory management
│   │   └── upload/               # File upload handling
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout with providers
│   ├── loading.tsx              # Global loading component
│   └── page.tsx                 # Main chat interface
├── components/                   # React Components
│   ├── ui/                      # Reusable UI components (Radix)
│   ├── ChatHeader.tsx           # Chat interface header
│   ├── ErrorBoundary.tsx        # Error handling wrapper
│   ├── FileUploadDialog.tsx     # File upload interface
│   ├── LeftNavigation.tsx       # Sidebar navigation
│   ├── MainContent.tsx          # Main chat area
│   ├── ManageMemory.tsx         # Memory management interface
│   └── SearchDialog.tsx         # Chat search functionality
├── hooks/                        # Custom React hooks
│   ├── use-active-chat.ts       # Active chat management
│   ├── use-chat-history.ts      # Chat history operations
│   ├── use-mobile.ts            # Mobile detection
│   ├── use-responsive.ts        # Responsive utilities
│   └── use-toast.ts             # Toast notifications
├── lib/                          # Utilities and services
│   ├── models/                  # Database models
│   │   └── Chat.ts              # MongoDB chat schema
│   ├── services/                # Business logic
│   │   ├── backgroundSaver.ts   # Background save operations
│   │   └── chatService.ts       # Chat service layer
│   ├── memory.ts                # Mem0 integration
│   ├── mongodb.ts               # Database connection
│   ├── session.ts               # Session management
│   └── utils.ts                 # Common utilities
├── docs/                         # Documentation
│   └── MONGODB_SETUP.md         # MongoDB setup guide
├── scripts/                      # Utility scripts
│   ├── test-api.js              # API testing
│   └── test-mongodb.js          # Database testing
└── public/                       # Static assets
    └── *.png                    # Sample images and placeholders
```

## ⚙️ Installation & Setup

### Prerequisites
- Node.js 18+ and pnpm
- MongoDB (local or Atlas)
- Clerk account for authentication
- Google AI API key (Gemini)
- Mem0 API key (optional, for memory features)
- Cloudinary account (optional, for image generation)

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/chatgpt

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI Integration
GOOGLE_GENAI_API_KEY=your_google_api_key

# Memory Management (Optional)
MEM0_API_KEY=your_mem0_api_key

# Image Generation (Optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chatgpt
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up MongoDB**
   - Follow the guide in `docs/MONGODB_SETUP.md`
   - Test connection: `pnpm run test:mongodb`

4. **Configure authentication**
   - Create a Clerk application
   - Add your keys to `.env.local`

5. **Start development server**
   ```bash
   pnpm dev
   ```

6. **Build for production**
   ```bash
   pnpm build
   pnpm start
   ```

## 🔧 Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm test:mongodb` - Test MongoDB connection

## 📖 API Documentation

### Chat Endpoints
- `GET /api/chats` - Get user's chat history
- `POST /api/chats` - Create new chat
- `GET /api/chats/[chatId]` - Get specific chat
- `PUT /api/chats/[chatId]` - Update chat
- `DELETE /api/chats/[chatId]` - Delete chat
- `POST /api/chats/[chatId]/messages` - Add message to chat

### Core Features
- `POST /api/chat` - Main chat endpoint with streaming
- `POST /api/images/generate` - Generate images
- `POST /api/upload` - File upload handling
- `POST /api/memory/add` - Add to memory
- `GET /api/memory` - Retrieve memories

## 🎮 Usage Examples

### Basic Chat
1. Start a new conversation by typing a message
2. AI responds in real-time with streaming
3. Chat history is automatically saved
4. Use search (Ctrl+K) to find previous conversations

### Memory Management
1. Access memory settings via the navigation menu
2. View stored memories and context
3. Add or remove specific memories
4. Memory automatically influences future conversations

### Image Generation
1. Ask for image generation in chat
2. Images are generated and stored via Cloudinary
3. View full-size images by clicking thumbnails

### File Upload
1. Use the upload button or drag-and-drop
2. Supported formats: images, documents, text files
3. File content is processed and added to conversation context

## 🔐 Security Features

- **Authentication**: Secure user sessions with Clerk
- **API Protection**: All endpoints require valid authentication
- **Data Isolation**: User data is properly isolated using user IDs
- **File Validation**: Uploaded files are validated and sanitized
- **Environment Variables**: Sensitive data stored securely

## 🚀 Performance Optimizations

- **Streaming Responses**: Real-time AI responses
- **Database Indexing**: Optimized MongoDB queries
- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Cloudinary CDN integration
- **Background Processing**: Non-blocking save operations
- **Caching**: Efficient data caching strategies

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection**
   ```bash
   # Test connection
   node scripts/test-mongodb.js
   ```

2. **Authentication Issues**
   - Verify Clerk keys are correct
   - Check middleware configuration

3. **AI Responses Not Working**
   - Confirm Google AI API key is valid
   - Check API quotas and billing

4. **Build Errors**
   - Run `pnpm lint` to check for issues
   - Ensure all environment variables are set

### Debug Mode
Set `NODE_ENV=development` and check browser console for detailed error messages.

## 📚 Additional Resources

- [MongoDB Setup Guide](docs/MONGODB_SETUP.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Authentication](https://clerk.dev/docs)
- [Google AI Documentation](https://ai.google.dev/docs)
- [Mem0 AI Documentation](https://docs.mem0.ai/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [React](https://react.dev/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- AI powered by [Google Gemini](https://ai.google.dev/)
- Authentication by [Clerk](https://clerk.dev/)
- Database with [MongoDB](https://www.mongodb.com/)
- Memory management by [Mem0 AI](https://mem0.ai/)
- Image hosting by [Cloudinary](https://cloudinary.com/)