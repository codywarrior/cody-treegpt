# GPTree - AI Conversation Tree Explorer

A full-stack web application for branching AI conversations with interactive tree visualization. Build complex dialogue trees, explore alternative conversation paths, and maintain context across branches.

## Features

- **Branching Conversations**: Create alternative paths from any message in the conversation thread
- **D3.js Tree Visualization**: Interactive graph with zoom, pan, node selection, and active path highlighting
- **Streaming AI Responses**: Real-time OpenAI GPT integration with animated loading states
- **Smart Context Building**: Path-aware context management with 7000 token limit and message prioritization
- **Export & Import**: JSON and Markdown format support with download functionality
- **Public Sharing**: Generate secure shareable links with token-based access control
- **Message Management**: Edit, delete, and branch from any message with confirmation dialogs
- **Search & Pagination**: Find conversations quickly with real-time search and paginated results
- **Dark Mode**: System preference detection with manual theme switching
- **Session Authentication**: Secure bcrypt-based login with persistent sessions

## Tech Stack

**Backend**
- Next.js 15.5.2 (App Router, API Routes, TypeScript)
- PostgreSQL + Prisma ORM 6.15.0
- OpenAI API 5.16.0
- bcryptjs 3.0.2 (password hashing)
- Session-based authentication

**Frontend**
- React 19.1.0
- TanStack Query 5.85.5 (server state management)
- D3.js 7.9.0 (tree visualization)
- Tailwind CSS 4 (styling)
- Framer Motion 12.23.12 (animations)
- Radix UI (accessible components)
- React Markdown 10.1.0 (message rendering)

**Key Libraries**
- Zustand 5.0.8 (client state)
- Lucide React 0.542.0 (icons)
- Sonner 2.0.7 (toast notifications)
- remark-gfm 4.0.1 + rehype-highlight 7.0.2 (markdown processing)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Vercel Postgres)
- OpenAI API key

### Setup

```bash
# Clone and install
git clone <repo-url>
cd gptree
npm install

# Environment setup
cp .env.example .env
# Edit .env with your credentials:
# DATABASE_URL="postgresql://user:pass@localhost:5432/gptree"
# SESSION_SECRET="your-secure-random-string"
# OPENAI_API_KEY="sk-your-openai-key"

# Database setup
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

**Required Services:**
- PostgreSQL database
- OpenAI API access

**Development Tools:**
- `npm run build` - Production build
- `npm run lint` - ESLint check
- `npm run format` - Prettier formatting

## Architecture

**Database Schema**
- `User` → `Conversation` → `Node` (tree structure via `parentId`)
- DAG (Directed Acyclic Graph) for conversation branching
- Share tokens for public access control

**Key Algorithms**
- **Tree Traversal**: `pathToRoot()` for active path calculation
- **Context Building**: Token-limited AI context with message prioritization
- **Graph Layout**: D3 hierarchical positioning with custom node spacing
- **State Sync**: TanStack Query with optimistic updates

**API Design**
- RESTful endpoints for CRUD operations
- Streaming AI responses via Server-Sent Events
- Session-based auth middleware
- Rate limiting and error handling

**UI/UX**
- Split-pane layout: chat interface + tree visualization
- Real-time graph updates with smooth animations
- Responsive design with touch/keyboard navigation
- Toast notifications and confirmation dialogs

## Project Structure

```
src/
├── app/
│   ├── api/                      # Backend API routes
│   │   ├── auth/                 # Sign in/out, session management  
│   │   ├── conversations/        # Conversation CRUD operations
│   │   ├── nodes/[nodeId]/       # Message operations & AI replies
│   │   ├── export/[cid]/         # JSON/Markdown export endpoints
│   │   └── share/                # Public sharing & token management
│   ├── c/[cid]/                  # Conversation workspace UI
│   ├── auth/signin/              # Authentication pages
│   └── page.tsx                  # Dashboard with conversation list
├── components/
│   ├── chat/                     # Chat interface components
│   ├── visualization/            # D3.js graph components
│   ├── conversation/             # Conversation list & management
│   ├── share/                    # Public sharing modal
│   └── ui/                       # Reusable UI primitives
├── hooks/
│   ├── use-chat-actions.ts       # Message operations
│   ├── use-conversations.ts      # Conversation management  
│   ├── use-nodes.ts              # Node CRUD operations
│   ├── use-export-import.ts      # Export/import functionality
│   └── use-share.ts              # Public sharing operations
├── lib/
│   ├── ai-context.ts             # AI context building
│   ├── tree-algorithms.ts        # Tree traversal algorithms
│   ├── chat-utils.ts             # Chat data transformations
│   ├── auth.ts                   # Session middleware
│   └── types.ts                  # TypeScript interfaces
├── services/                     # API client layer
└── prisma/schema.prisma          # Database schema
```

## Usage

**Dashboard**
- Create new conversations with custom titles
- Search and paginate through existing conversations
- Edit conversation titles or delete conversations

**Conversation Workspace**
- **Chat Interface**: Send messages, edit/delete messages, branch from any message
- **Tree Visualization**: Click nodes to navigate branches, view active conversation path
- **Keyboard Navigation**: Use arrow keys and Enter for efficient navigation
- **AI Integration**: Stream responses from OpenAI with context-aware prompting

**Advanced Features**
- **Export**: Download conversations as JSON or formatted Markdown
- **Import**: Upload and restore conversation JSON files
- **Public Sharing**: Generate secure links for read-only conversation access
- **Dark Mode**: Toggle theme or follow system preference

**Keyboard Shortcuts**
- `Enter` - Send message
- `Shift + Enter` - New line in message
- `Esc` - Cancel current action

## Development

**Code Quality**
- ESLint + Prettier for code formatting
- Husky pre-commit hooks
- TypeScript strict mode
- Component-based architecture

**Testing & Deployment**
- Built-in Next.js optimizations
- Prisma migrations for database versioning
- Environment-based configuration
- Production-ready with Vercel deployment support

---

**License**: MIT
