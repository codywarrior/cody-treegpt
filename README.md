# GPTree - Tree-Structured AI Conversations

A Next.js application enabling branching AI conversations in a tree structure. Create conversation branches, explore different paths, and maintain full context across complex dialogue trees.

## Implemented Features

- **Tree-Structured Conversations**: Branch from any message to create alternative conversation paths
- **Interactive Graph Visualization**: D3.js tree layout with node navigation and active path highlighting
- **Context-Aware AI**: OpenAI GPT-4o-mini integration with path-aware context building (7000 token limit)
- **Real-Time Streaming**: Server-sent events for live AI response streaming with 60s timeout
- **Conversation Management**: Create, edit, delete conversations with search and pagination
- **Export/Import**: JSON and Markdown export/import functionality
- **Public Sharing**: Generate shareable links for conversations
- **Dark Mode**: Theme switching with system preference detection
- **Authentication**: Session-based auth with bcrypt password hashing

## Technical Stack

### Core Framework

- **Next.js 15.5.2** with App Router and TypeScript
- **React 19.1.0** with React Server Components
- **PostgreSQL** with Prisma ORM (v6.15.0)

### UI & Styling

- **Tailwind CSS 4** for styling
- **Framer Motion 12.23.12** for animations
- **Radix UI** components (dialogs, tabs, toasts)
- **Lucide React** for icons

### AI & Data Processing

- **OpenAI API 5.16.0** with GPT-4o-mini model
- **React Markdown 10.1.0** with syntax highlighting
- **remark-gfm 4.0.1** and **rehype-highlight 7.0.2**

### Visualization

- **D3.js 7.9.0** with d3-hierarchy and d3-zoom
- Custom tree layout algorithms for node positioning

### Authentication & Security

- **bcryptjs 3.0.2** for password hashing
- Session-based authentication with secure cookies
- Rate limiting (10 requests/minute per user)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Vercel Postgres)
- OpenAI API key

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd gptree
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp env.example .env.local
```

Edit `.env.local` with your values:

```env
DATABASE_URL="your-postgres-connection-string"
SESSION_SECRET="your-long-random-session-secret"
OPENAI_API_KEY="your-openai-api-key"
```

4. Set up the database:

```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Branching Implementation

### Tree Structure

- Each conversation node has a `parentId` creating a directed acyclic graph (DAG)
- Active path calculation: `getActivePath()` traverses from selected node to root
- Context building: `buildAIContext()` with 7000 token limit and recent message prioritization
- AI responses streamed via Server-Sent Events and stored as child nodes

### Core Algorithms

- **Path Finding**: `pathToRoot()` and `findLcaIndex()` for efficient tree traversal
- **Context Management**: Token estimation and summarization for long conversation paths
- **Rate Limiting**: 10 requests/minute per user with IP-based tracking

### Graph Visualization

- **D3.js Tree Layout**: Hierarchical positioning with `d3.tree()` and custom spacing
- **Interactive Navigation**: Click nodes to switch conversation branches
- **Active Path Highlighting**: Visual emphasis on current conversation thread

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/                    # login, logout, signup endpoints
│   │   ├── conversations/           # CRUD for conversations
│   │   ├── nodes/[nodeId]/ai-reply/ # SSE streaming for AI responses
│   │   ├── export/[cid]/           # JSON/Markdown export
│   │   └── share/                  # Public sharing tokens
│   ├── c/[cid]/                    # Conversation workspace pages
│   └── auth/signin/                # Authentication UI
├── components/
│   ├── ChatPaneV2.tsx              # Chat interface with branching
│   ├── Graph.tsx                   # D3.js tree visualization
│   ├── ExportImportDialog.tsx      # Export/import functionality
│   └── ShareDialog.tsx             # Public sharing interface
├── lib/
│   ├── ai-context.ts               # Context building & token management
│   ├── tree-algorithms.ts          # Path finding & tree traversal
│   ├── auth.ts                     # Session management
│   └── types.ts                    # TypeScript definitions
└── prisma/schema.prisma            # Database schema
```

## Usage

1. **Authentication**: Sign up/login with email and password
2. **Create Conversations**: Start new branching conversations from the dashboard
3. **Send Messages**: Type in the chat interface (Enter to send, Shift+Enter for new line)
4. **Branch Creation**: Click branch icon on any message to create alternative conversation paths
5. **Tree Navigation**: Click nodes in the graph to switch between conversation branches
6. **AI Responses**: Automatic streaming responses with retry options

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
