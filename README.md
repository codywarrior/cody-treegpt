# GPTree - Branching Chat Application

GPTree is a web application that enables branching conversations in a tree structure, allowing users to explore different conversation paths without losing context. Users can branch off from assistant messages to explore sub-concepts and create complex conversation trees.

## Features

- **Branching Conversations**: Create branches from any assistant message to explore different topics
- **Tree Visualization**: Interactive graph showing the conversation structure with D3.js
- **Path-Aware AI**: OpenAI integration that understands the full conversation context
- **User Authentication**: Secure login system with bcrypt password hashing
- **Real-time Updates**: Smooth animations and real-time conversation updates
- **Export/Import**: Save conversations as JSON or Markdown (coming soon)

## Tech Stack

- **Framework**: Next.js 14 with App Router and TypeScript
- **Database**: Vercel Postgres with Prisma ORM
- **UI**: Tailwind CSS with shadcn/ui components
- **Animations**: Framer Motion
- **Visualization**: D3.js with SVG rendering
- **AI**: OpenAI API integration
- **Authentication**: Manual system with bcrypt and sessions

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

## Usage

1. **Sign Up/Login**: Create an account or log in to access your conversations
2. **Create Conversation**: Start a new conversation from the home page
3. **Send Messages**: Type messages in the chat interface
4. **Branch Conversations**: Click the branch icon on assistant messages to create new paths
5. **Navigate Tree**: Use the graph visualization to navigate between different conversation paths
6. **AI Replies**: Click the bot icon to request AI responses that understand the full conversation context

## Project Structure

```
src/
├── app/                 # Next.js app router pages and API routes
│   ├── api/            # API endpoints
│   ├── auth/           # Authentication pages
│   └── c/[cid]/        # Conversation workspace
├── components/         # React components
│   ├── ChatPane.tsx    # Chat interface
│   └── Graph.tsx       # Tree visualization
├── lib/                # Utilities and core logic
│   ├── auth.ts         # Authentication helpers
│   ├── db.ts           # Database client
│   ├── tree-algorithms.ts  # Tree traversal algorithms
│   └── types.ts        # TypeScript type definitions
└── prisma/             # Database schema
```

## Core Algorithms

- **Path Finding**: Efficient algorithms to find paths between nodes
- **LCA (Lowest Common Ancestor)**: Used for smooth transitions between conversation branches
- **Tree Layout**: D3.js hierarchy layout for optimal graph visualization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
