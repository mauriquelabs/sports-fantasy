# Sports Fantasy - YourLeague

A modern fantasy sports platform where users can create private leagues, draft real players, and compete with friends. Built with React, TypeScript, and Express.

## 🎯 Features

- **Private Leagues**: Create exclusive leagues with custom rules
- **Real-time Drafting**: Interactive draft boards with live updates
- **Player Statistics**: Real player stats and performance data
- **In-game Economy**: Trade players, negotiate contracts, and manage budgets
- **Modern UI**: Beautiful, responsive design built with TailwindCSS and Radix UI

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **React Router 6** for SPA routing
- **Vite** for fast development and building
- **TailwindCSS 3** for styling
- **Radix UI** component library (40+ pre-built components)
- **TanStack Query** for server state management
- **Lucide React** for icons

### Backend
- **Express.js** API server
- **TypeScript** for type safety
- **Zod** for schema validation

### Development Tools
- **Vitest** for testing
- **ESLint** and **Prettier** for code quality
- Hot module replacement for both client and server

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher) or **yarn**

You can check your versions by running:
```bash
node --version
npm --version
```

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd sports-fantasy
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies for both the client and server.

### 3. Environment Setup

Create a `.env` file in the root directory (optional):

```env
PING_MESSAGE=ping
```

The `.env` file is optional for basic functionality. Add more environment variables as needed for your specific features.

### 4. Run the Development Server

```bash
npm run dev
```

This command:
- Starts the Vite dev server on port **8080**
- Integrates the Express backend on the same port
- Enables hot module replacement for both client and server
- Opens the app at `http://localhost:8080`

You should see output indicating the server is running. Navigate to `http://localhost:8080` in your browser.

## 📁 Project Structure

```
sports-fantasy/
├── client/                 # React frontend application
│   ├── pages/             # Route components
│   │   ├── Index.tsx      # Home page
│   │   ├── Login.tsx      # Login page
│   │   ├── SignUp.tsx     # Sign up page
│   │   └── NotFound.tsx   # 404 page
│   ├── components/
│   │   └── ui/            # Pre-built UI component library
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── App.tsx            # Main app component with routing
│   └── global.css         # Global styles and TailwindCSS config
│
├── server/                # Express backend
│   ├── routes/            # API route handlers
│   │   └── demo.ts        # Example route
│   └── index.ts           # Server setup and configuration
│
├── shared/                # Shared code between client & server
│   └── api.ts             # Shared TypeScript types/interfaces
│
├── public/                # Static assets
├── netlify/               # Netlify deployment configuration
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite configuration
└── tailwind.config.ts     # TailwindCSS configuration
```

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (client + server on port 8080) |
| `npm run build` | Build for production (builds both client and server) |
| `npm run build:client` | Build only the client application |
| `npm run build:server` | Build only the server application |
| `npm start` | Start production server |
| `npm test` | Run Vitest tests |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run format.fix` | Format code with Prettier |

## 🎨 Development Guide

### Adding a New Page

1. Create a new component in `client/pages/`:
```typescript
// client/pages/MyPage.tsx
export default function MyPage() {
  return <div>My New Page</div>;
}
```

2. Add the route in `client/App.tsx`:
```typescript
import MyPage from "./pages/MyPage";

<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/my-page" element={<MyPage />} />
  {/* Add routes above the catch-all */}
  <Route path="*" element={<NotFound />} />
</Routes>
```

### Adding a New API Endpoint

1. **Optional**: Define shared types in `shared/api.ts`:
```typescript
export interface MyRouteResponse {
  message: string;
  data: any;
}
```

2. Create a route handler in `server/routes/my-route.ts`:
```typescript
import { RequestHandler } from "express";
import { MyRouteResponse } from "@shared/api";

export const handleMyRoute: RequestHandler = (req, res) => {
  const response: MyRouteResponse = {
    message: 'Success',
    data: {}
  };
  res.json(response);
};
```

3. Register the route in `server/index.ts`:
```typescript
import { handleMyRoute } from "./routes/my-route";

app.get("/api/my-endpoint", handleMyRoute);
```

4. Use in your React components:
```typescript
const response = await fetch('/api/my-endpoint');
const data: MyRouteResponse = await response.json();
```

### Using UI Components

The project includes 40+ pre-built Radix UI components in `client/components/ui/`. Import and use them like:

```typescript
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

<Button variant="default">Click me</Button>
<Card>Content here</Card>
```

### Path Aliases

- `@/` - Points to `client/` directory
- `@shared/` - Points to `shared/` directory

Example:
```typescript
import { Button } from "@/components/ui/button";
import { DemoResponse } from "@shared/api";
```

## 🧪 Testing

Run tests with:
```bash
npm test
```

The project uses Vitest for testing. Test files should be named `*.spec.ts` or `*.test.ts`.

## 🏗️ Building for Production

1. Build the application:
```bash
npm run build
```

This creates:
- `dist/spa/` - Built client application
- `dist/server/` - Built server application

2. Start the production server:
```bash
npm start
```

## 🚢 Deployment

### Standard Deployment
Build and start the production server as shown above.

### Netlify/Vercel
The project is configured for easy deployment to Netlify or Vercel. Use their respective MCP integrations for deployment.

### Environment Variables
Make sure to set any required environment variables in your deployment platform.

## 📝 Current Status

### ✅ Implemented
- Landing page with hero section and features
- Login and Sign Up pages (UI)
- Routing system
- UI component library
- Express API server setup
- Development environment with hot reload

### 🚧 In Progress / Planned
- User authentication and authorization
- League creation and management
- Draft system implementation
- Player statistics integration
- Scoring and leaderboard systems
- Real-time updates

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Ensure tests pass (`npm test`)
4. Ensure type checking passes (`npm run typecheck`)
5. Submit a pull request

## 📄 License

[Add your license information here]

## 🙋 Support

For questions or issues, please open an issue in the repository.

---

Built with ❤️ using the Fusion Starter template


