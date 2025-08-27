# ChatGPT Clone

A modern, full-featured ChatGPT clone built with Next.js 15, featuring real-time AI chat with Google Gemini, persistent memory management, image generation, and multimodal capabilities. Designed for both authenticated and anonymous users with enterprise-grade performance and security.

## 🌟 Highlights

- **🧠 Intelligent Memory**: Persistent conversation context using Mem0 AI across sessions
- **🖼️ Multimodal AI**: Chat with images, generate new images, and process various file types
- **⚡ Real-time Streaming**: Character-by-character AI responses with abort capabilities
- **🔐 Flexible Authentication**: Works for both authenticated users (Clerk) and anonymous sessions
- **🚀 Enterprise Ready**: Production-optimized with comprehensive error handling and retry logic
- **📱 Responsive Design**: Mobile-first approach with adaptive layouts and touch-friendly interface

## 🚀 Features

### Core AI Capabilities
- **Advanced Chat**: Real-time conversations with Google's Gemini 2.0 Flash model
- **Persistent Memory**: Context-aware conversations that remember previous interactions
- **Image Generation**: AI-powered image creation with Cloudinary CDN integration
- **Multimodal Input**: Upload and analyze images, PDFs, documents, and text files
- **Smart Context**: Automatic memory injection for personalized responses

### User Experience
- **Dual Authentication**: Supports both Clerk authentication and anonymous sessions
- **Real-time Streaming**: Live character-by-character response streaming
- **Advanced Search**: Full-text search across chat history with relevance scoring
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark Theme**: Modern UI with smooth animations and transitions
- **Keyboard Shortcuts**: Power-user shortcuts (Ctrl+B, Ctrl+K, Ctrl+N, Esc)
- **Error Recovery**: Comprehensive error boundaries with retry functionality

### Technical Features
- **Database Optimization**: Compound indexes and lean queries for performance
- **Background Processing**: Non-blocking memory saving and cleanup operations
- **Session Management**: Robust session handling with automatic cleanup
- **File Validation**: Secure file upload with size and type validation (10MB limit)
- **CDN Integration**: Cloudinary for optimized image storage and delivery
- **Text Search**: MongoDB full-text search with custom scoring algorithms

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router and React 19
- **Styling**: Tailwind CSS 4.x with custom animations
- **UI Components**: Radix UI primitives with custom theming
- **Icons**: Lucide React icon library
- **Animations**: Framer Motion for smooth transitions
- **Typography**: Geist Sans & Mono font family
- **State Management**: React hooks with optimized context usage

### Backend & AI
- **API**: Next.js API routes with TypeScript
- **Database**: MongoDB with Mongoose ODM and optimized indexing
- **Authentication**: Clerk for user management with session fallback
- **AI Models**: Google Gemini 2.0 Flash (chat & image generation)
- **Memory System**: Mem0 AI for persistent conversation context
- **Image Processing**: Cloudinary for storage, optimization, and CDN
- **Streaming**: Web Streams API for real-time response delivery

### Development & DevOps
- **Language**: TypeScript with strict configuration
- **Package Manager**: pnpm for efficient dependency management
- **Code Quality**: ESLint with Next.js and TypeScript rules
- **Build System**: Next.js optimized builds with automatic optimization
- **Environment**: Centralized config with validation and service detection

## 📁 Project Architecture

```
chatgpt/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/debug/           # Authentication debugging
│   │   ├── chat/                 # Main chat endpoint (streaming)
│   │   ├── chats/                # Chat management (CRUD + search)
│   │   │   ├── [chatId]/         # Individual chat operations
│   │   │   ├── search/           # Full-text search endpoint
│   │   │   └── stats/            # Chat analytics
│   │   ├── images/               # Image generation & gallery
│   │   │   ├── generate/         # AI image generation
│   │   │   ├── gallery/          # User image gallery
│   │   │   └── stats/            # Image analytics
│   │   ├── memory/               # Mem0 AI memory management
│   │   │   ├── add/              # Add memories
│   │   │   ├── debug/            # Memory debugging
│   │   │   └── status/           # Service status
│   │   └── upload/               # File upload handling
│   ├── globals.css               # Global styles and themes
│   ├── layout.tsx                # Root layout with providers
│   ├── loading.tsx               # Global loading component
│   └── page.tsx                  # Main chat interface
├── components/                   # React Components
│   ├── ui/                       # Radix UI component library (40+ components)
│   ├── ChatHeader.tsx            # Chat interface header with controls
│   ├── ChatInterface.tsx         # Basic chat component
│   ├── ErrorBoundary.tsx         # Error handling with retry logic
│   ├── FileUploadDialog.tsx      # Drag-and-drop file upload
│   ├── ImageGallery.tsx          # Image display and management
│   ├── LeftNavigation.tsx        # Sidebar with chat history
│   ├── MainContent.tsx           # Chat area wrapper
│   ├── MainContentIntegrated.tsx # Primary chat interface with streaming
│   ├── ManageMemory.tsx          # Memory management interface
│   ├── SearchDialog.tsx          # Full-text chat search
│   ├── SidebarToggle.tsx         # Mobile navigation toggle
│   └── UnAuth*.tsx               # Anonymous user components
├── hooks/                        # Custom React Hooks
│   ├── use-active-chat.ts        # Active chat state management
│   ├── use-chat-history.ts       # Chat history operations with caching
│   ├── use-mobile.ts             # Mobile device detection
│   ├── use-responsive.ts         # Responsive design utilities
│   └── use-toast.ts              # Toast notification system
├── lib/                          # Core Library & Services
│   ├── models/                   # MongoDB Schemas
│   │   ├── Chat.ts               # Chat model with optimized indexes
│   │   └── Image.ts              # Image models (user/generated)
│   ├── services/                 # Business Logic Layer
│   │   ├── backgroundSaver.ts    # Async background operations
│   │   └── chatService.ts        # Chat operations abstraction
│   ├── database/                 # Database Utilities
│   │   └── optimization.ts       # Query optimization helpers
│   ├── cloudinary-client.ts      # Cloudinary client configuration
│   ├── cloudinary-server.ts      # Server-side Cloudinary operations
│   ├── env.ts                    # Environment validation & config
│   ├── errors.ts                 # Structured error handling
│   ├── logger.ts                 # Application logging
│   ├── memory.ts                 # Mem0 AI integration
│   ├── mongodb.ts                # Database connection with retry logic
│   ├── session.ts                # Session management for anonymous users
│   └── utils.ts                  # Common utilities and helpers
├── types/                        # TypeScript Definitions
│   ├── api.ts                    # API request/response types
│   └── chat.ts                   # Chat and message types
├── docs/                         # Documentation
│   └── MONGODB_SETUP.md          # Database setup guide
├── scripts/                      # Utility Scripts
│   ├── test-api.js               # API endpoint testing
│   └── test-mongodb.js           # Database connection testing
├── middleware.ts                 # Clerk authentication middleware
├── next.config.mjs               # Next.js configuration with optimization
└── public/                       # Static Assets
    └── chatgpt.png               # Application icon and assets
```

### Key Architectural Patterns

- **Service Layer Pattern**: Clean separation between API routes and business logic
- **Repository Pattern**: Abstracted database operations with optimization
- **Streaming Architecture**: Real-time response delivery with proper cleanup
- **Background Processing**: Non-blocking operations for enhanced UX
- **Hybrid Authentication**: Flexible user management for different use cases
- **Error Boundary Pattern**: Graceful error handling throughout the application

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js**: Version 18+ with pnpm package manager
- **MongoDB**: Local installation or MongoDB Atlas cloud database
- **Clerk Account**: For user authentication (free tier available)
- **Google AI API**: For Gemini model access
- **Mem0 API** (Optional): For enhanced memory features
- **Cloudinary Account** (Optional): For image generation and storage

### Environment Configuration

Create a `.env.local` file with the following variables:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/chatgpt
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/chatgpt

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI Integration (Required)
GOOGLE_GENAI_API_KEY=your_google_gemini_api_key

# Memory System (Optional - enables context-aware conversations)
MEM0_API_KEY=your_mem0_api_key

# Image Generation (Optional - enables image creation)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Development (Optional)
NODE_ENV=development
```

### Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd chatgpt
   pnpm install
   ```

2. **Database Setup**
   ```bash
   # For local MongoDB (see docs/MONGODB_SETUP.md for details)
   mongod --dbpath /path/to/data/db
   
   # Test connection
   pnpm run test:mongodb
   ```

3. **Configure Authentication**
   - Create a [Clerk](https://clerk.dev) application
   - Add your keys to `.env.local`
   - Configure allowed domains and redirect URLs

4. **Start Development Server**
   ```bash
   pnpm dev
   # Open http://localhost:3000
   ```

5. **Production Build**
   ```bash
   pnpm build
   pnpm start
   ```

### Advanced Configuration

#### Service Detection
The application automatically detects configured services:
- **Memory features**: Enabled when `MEM0_API_KEY` is provided
- **Image generation**: Enabled when Cloudinary credentials are provided
- **Enhanced analytics**: Additional features with full service configuration

#### Performance Tuning
- **Database**: Use MongoDB Atlas with proper indexing for production
- **CDN**: Configure Cloudinary auto-optimization for images
- **Caching**: Enable Next.js cache for static assets and API responses

## 🔧 Available Scripts

- **`pnpm dev`**: Start development server with hot reload
- **`pnpm build`**: Build optimized production bundle
- **`pnpm start`**: Start production server
- **`pnpm lint`**: Run ESLint with TypeScript rules
- **`pnpm test:mongodb`**: Test database connection and performance

### Testing Scripts
- **`node scripts/test-api.js`**: Test all API endpoints
- **`node scripts/test-mongodb.js`**: Comprehensive database testing

## 📖 API Documentation

### Core Chat API

#### Main Chat Endpoint
```typescript
POST /api/chat
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?",
      "attachments"?: Array<{url: string, contentType: string}>
    }
  ],
  "userId"?: string,     // For authenticated users
  "sessionId"?: string   // For anonymous users
}

Response: Stream of Server-Sent Events
```

#### Chat Management
- **`GET /api/chats`**: Retrieve user's chat history with pagination
- **`POST /api/chats`**: Create new chat session
- **`GET /api/chats/[chatId]`**: Get specific chat with full message history
- **`PUT /api/chats/[chatId]`**: Update chat metadata (title, archived status)
- **`DELETE /api/chats/[chatId]`**: Permanently delete chat
- **`POST /api/chats/[chatId]/messages`**: Add message to existing chat
- **`GET /api/chats/search?q=query`**: Full-text search across chat history
- **`GET /api/chats/stats`**: Get chat analytics and statistics

### Memory Management API
- **`POST /api/memory/add`**: Add information to user's memory
- **`GET /api/memory`**: Retrieve stored memories with search
- **`DELETE /api/memory`**: Clear specific memories
- **`GET /api/memory/status`**: Check Mem0 service availability

### Image & File API
- **`POST /api/images/generate`**: Generate images from text prompts
- **`GET /api/images/gallery`**: Get user's image gallery
- **`GET /api/images/stats`**: Image generation analytics
- **`POST /api/upload`**: Upload files (images, PDFs, documents)

### Authentication & Debug
- **`GET /api/auth/debug`**: Debug authentication status
- **`GET /api/memory/debug`**: Debug memory service connection

## 🎮 Usage Guide

### Getting Started
1. **First Visit**: Choose to sign in with Clerk or continue as anonymous user
2. **Start Chatting**: Type a message and experience real-time AI responses
3. **Upload Files**: Drag and drop images or documents for AI analysis
4. **Generate Images**: Ask the AI to create images from text descriptions

### Advanced Features

#### Memory Management
```bash
# Access via navigation menu
Settings → Manage Memory

# View stored memories
# Add specific information to memory
# Search through memory context
# Delete outdated memories
```

#### Search & Navigation
```bash
# Keyboard Shortcuts
Ctrl+K    # Open search dialog
Ctrl+N    # Start new chat
Ctrl+B    # Toggle sidebar
Esc       # Close dialogs/modals

# Search Features
- Full-text search across all chats
- Relevance-based scoring
- Date range filtering
- Message-level precision
```

#### File Processing
**Supported Formats:**
- **Images**: PNG, JPEG, GIF, WebP (for AI analysis)
- **Documents**: PDF, DOCX, TXT (content extraction)
- **Code Files**: Most programming languages
- **Size Limit**: 10MB per file

#### Image Generation
```bash
# Example prompts:
"Create a futuristic cityscape at sunset"
"Generate a minimalist logo for a tech company"
"Draw a cute cartoon character"

# Images are automatically:
- Generated via Google Gemini
- Stored on Cloudinary CDN
- Added to your gallery
- Searchable by prompt text
```

## 🔐 Security & Performance

### Security Features
- **Authentication**: Secure JWT tokens with Clerk integration
- **API Protection**: All endpoints validate user sessions
- **Data Isolation**: User data strictly segregated by user/session ID
- **File Validation**: Comprehensive upload security with type/size checks
- **XSS Protection**: Sanitized inputs and CSP headers
- **Environment Security**: Sensitive configuration separated and validated

### Performance Optimizations
- **Database Indexing**: Compound indexes for common query patterns
- **Lean Queries**: Minimal data transfer with projection optimization
- **CDN Integration**: Cloudinary for global image delivery
- **Streaming Responses**: Immediate response start with chunked delivery
- **Background Processing**: Non-blocking operations for memory and cleanup
- **Connection Pooling**: MongoDB connection optimization
- **Error Recovery**: Exponential backoff with circuit breaker patterns

### Monitoring & Analytics
- **Request Logging**: Comprehensive logging with error tracking
- **Performance Metrics**: Response times and database query performance
- **Usage Statistics**: Chat counts, image generation, and user engagement
- **Error Tracking**: Detailed error reporting with context

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Test MongoDB connection
node scripts/test-mongodb.js

# Check connection string format
MONGODB_URI=mongodb://localhost:27017/chatgpt

# For Atlas (cloud):
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatgpt
```

#### Authentication Problems
```bash
# Verify Clerk configuration
curl http://localhost:3000/api/auth/debug

# Check middleware setup
# Ensure publishable key is correct
# Verify domain configuration in Clerk dashboard
```

#### AI Integration Issues
```bash
# Test API key validity
node scripts/test-api.js

# Common solutions:
- Check Google AI API quotas
- Verify billing is enabled
- Ensure API key has proper permissions
- Check service availability status
```

#### Memory Service Issues
```bash
# Check Mem0 service status
curl http://localhost:3000/api/memory/status

# Debug memory operations
curl http://localhost:3000/api/memory/debug

# Service may be optional - app works without memory features
```

#### Build & Development
```bash
# Fix TypeScript errors
pnpm lint

# Clear Next.js cache
rm -rf .next

# Reset dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Debug Mode
Enable comprehensive debugging:
```bash
NODE_ENV=development pnpm dev

# Check browser console for detailed error messages
# Monitor Network tab for API request/response details
# Use React Developer Tools for component inspection
```

### Performance Issues
```bash
# Monitor database performance
- Check MongoDB slow query log
- Ensure proper indexing
- Monitor connection pool usage

# Frontend optimization
- Check browser Network tab
- Monitor memory usage
- Use Lighthouse for performance audit
```

## 📚 Additional Resources

### Documentation Links
- **[MongoDB Setup Guide](docs/MONGODB_SETUP.md)**: Complete database configuration
- **[Next.js 15 Documentation](https://nextjs.org/docs)**: Framework documentation
- **[Clerk Authentication](https://clerk.dev/docs)**: User management
- **[Google AI Documentation](https://ai.google.dev/docs)**: Gemini API reference
- **[Mem0 AI Documentation](https://docs.mem0.ai/)**: Memory system integration
- **[Cloudinary Documentation](https://cloudinary.com/documentation)**: Image management

### Component Libraries
- **[Radix UI](https://www.radix-ui.com/)**: Accessible component primitives
- **[Tailwind CSS](https://tailwindcss.com/)**: Utility-first CSS framework
- **[Lucide Icons](https://lucide.dev/)**: Beautiful & consistent icons
- **[Framer Motion](https://www.framer.com/motion/)**: Animation library

### Development Tools
- **[pnpm](https://pnpm.io/)**: Fast, disk space efficient package manager
- **[TypeScript](https://www.typescriptlang.org/)**: Type-safe JavaScript
- **[ESLint](https://eslint.org/)**: Code linting and formatting

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Workflow
1. **Fork & Clone**: Fork the repository and clone your fork
2. **Setup Environment**: Follow the installation guide above
3. **Create Branch**: `git checkout -b feature/your-feature-name`
4. **Development**: Make your changes with tests
5. **Quality Check**: Run `pnpm lint` and fix any issues
6. **Commit**: Use conventional commit messages
7. **Push & PR**: Submit a pull request with detailed description

### Contribution Guidelines
- **Code Style**: Follow existing patterns and TypeScript conventions
- **Testing**: Test your changes thoroughly with provided scripts
- **Documentation**: Update documentation for new features
- **Performance**: Consider performance implications of changes
- **Security**: Never commit sensitive data or credentials

### Areas for Contribution
- **New AI Models**: Integration with additional AI providers
- **Enhanced Memory**: Advanced memory management features
- **Mobile App**: React Native version
- **Plugins**: Extension system for custom functionality
- **Analytics**: Advanced usage analytics and insights
- **Internationalization**: Multi-language support

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

### Core Technologies
- **[Next.js](https://nextjs.org/)** - The React framework for production
- **[React](https://react.dev/)** - A JavaScript library for building user interfaces
- **[TypeScript](https://www.typescriptlang.org/)** - JavaScript with syntax for types
- **[MongoDB](https://www.mongodb.com/)** - Document database for modern applications

### AI & Services
- **[Google Gemini](https://ai.google.dev/)** - Advanced AI models for chat and image generation
- **[Mem0 AI](https://mem0.ai/)** - Personalized AI memory layer
- **[Cloudinary](https://cloudinary.com/)** - Image and video management cloud service
- **[Clerk](https://clerk.dev/)** - User management and authentication

### UI & Design
- **[Radix UI](https://www.radix-ui.com/)** - Low-level UI primitives and components
- **[Tailwind CSS](https://tailwindcss.com/)** - A utility-first CSS framework
- **[Lucide](https://lucide.dev/)** - Beautiful & consistent icon library
- **[Framer Motion](https://www.framer.com/motion/)** - A production-ready motion library for React

### Special Thanks
- **Vercel** for Next.js and deployment platform
- **MongoDB** for Atlas cloud database service  
- **Google** for Gemini AI models and cloud services
- **Open Source Community** for the amazing tools and libraries

---

**Built with ❤️ using modern web technologies**

*This README was generated by analyzing the complete codebase to provide comprehensive documentation that serves both developers and users.*