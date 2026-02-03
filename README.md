# First Cat In Space Platformer Game Editor

A web-based platformer game editor designed for kids ages 8-12, featuring world map editing, level design, hand-drawn graphics integration, printable level exports, and scan/reimport functionality.

## 🎮 Overview

First Cat In Space Platformer is an educational game creation tool that empowers children to design and build their own side-scrolling platformer games. Kids can draw their own graphics, create world maps, design levels, and even print their levels to color in and scan back into the game.

## ✨ Features

### Current Features (Phase 1 - In Progress)
- ✅ **User Authentication** - OAuth login with Google + Local username/password authentication
- ✅ **User Profile Management** - Edit profile, change password, admin user management
- ✅ **Project Infrastructure** - React + TypeScript + Vite setup
- ✅ **Unified Logging System** - Comprehensive logging throughout the application
- ✅ **Testing Framework** - Vitest with React Testing Library

### Planned Features
- 🎨 **World Map Editor** - Create and organize game worlds with hand-drawn backgrounds
- 🏗️ **Level Editor** - Canvas-based editor with grid system and platform placement
- 🖼️ **Graphics System** - Upload, manage, and share hand-drawn graphics
- 🎯 **Character & Gameplay** - Playable character with physics, combat, and interactive objects
- 📄 **Export System** - Print levels for coloring with alignment marks
- 📸 **Scan & Reimport** - Scan colored pages and automatically import them back into the game
- 🌐 **Sharing** - Share graphics, levels, and complete games with the community

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite 7
- **State Management:** Zustand
- **Routing:** React Router v7
- **Authentication:** Google OAuth 2.0
- **Testing:** Vitest + React Testing Library

### Planned
- **Game Engine:** Phaser.js (2D rendering, physics)
- **Image Processing:** OpenCV.js (browser-side)
- **PDF Generation:** jsPDF
- **Storage:** IndexedDB (local) + Cloud storage (for sharing)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher
- **npm** 9.x or higher (comes with Node.js)
- **Git** (for version control)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/gabe-kai/fcis-platformer.git
cd fcis-platformer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
VITE_LOG_LEVEL=info
VITE_ENABLE_LOGGING=true
```

#### Setting Up Google OAuth 2.0

To enable Google sign-in, you need to create a Google OAuth 2.0 client ID:

1. **Go to Google Cloud Console**
   - Visit [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click the project dropdown at the top
   - Click "New Project" or select an existing project
   - Give it a name (e.g., "FCIS Platformer")

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" or "Google Identity Services API"
   - Click "Enable"

4. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted, configure the OAuth consent screen first:
     - Choose "External" (unless you have a Google Workspace)
     - Fill in the required fields (App name, User support email, Developer contact)
     - Add scopes: `email`, `profile`, `openid`
     - Add test users if needed (for development)

5. **Configure OAuth Client**
   - Application type: **Web application**
   - Name: "FCIS Platformer" (or your choice)
   - **Authorized JavaScript origins:**
     - `http://localhost:5173` (for Vite dev server)
     - Add your production URL when deploying
   - **Authorized redirect URIs:** (usually not needed for this setup)
     - Can be left empty for now
   - Click "Create"

6. **Copy Your Client ID**
   - A dialog will show your Client ID (looks like: `123456789-abcdefg.apps.googleusercontent.com`)
   - Copy this value
   - Paste it into your `.env` file as `VITE_GOOGLE_CLIENT_ID`

7. **Restart Your Dev Server**
   - After adding the `.env` file, restart `npm run dev` for changes to take effect

**Troubleshooting:**
- If you see "OAuth Not Configured" on the login page, check that:
  - Your `.env` file exists in the root directory
  - `VITE_GOOGLE_CLIENT_ID` is set correctly
  - You've restarted the dev server after creating/updating `.env`
- If sign-in fails, verify:
  - Your authorized JavaScript origin includes `http://localhost:5173` (or your current port)
  - The Client ID is correct (no extra spaces or quotes)
  - You're using the correct OAuth client (Web application type)

### 4. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port).

The dev server includes:
- Hot Module Replacement (HMR) for instant updates
- TypeScript type checking
- ESLint warnings in the console

## 📜 Available Scripts

### Development
- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview the production build locally

### Testing
- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run test:ui` - Open Vitest UI for interactive testing

### Code Quality
- `npm run lint` - Run ESLint to check for code issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking without building

## 📁 Project Structure

```
FCIS_Platformer/
├── docs/                    # Project documentation
│   └── guides/             # Implementation guides
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   │   └── auth/          # Authentication components
│   ├── services/          # Business logic services
│   ├── stores/            # Zustand state stores
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   ├── test/              # Test setup files
│   ├── App.tsx            # Main application component
│   └── main.tsx           # Application entry point
├── .env                    # Environment variables (not in git)
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
└── README.md               # This file
```

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Implementation Plan](docs/guides/implementation-plan.md)** - High-level project plan and phases
- **[Phase 1 Detailed Plan](docs/guides/phase1-detailed-plan.md)** - Step-by-step Phase 1 implementation guide
- **[Developer Guide](docs/guides/developer-guide.md)** - Development workflow and best practices
- **[Logging Guide](docs/guides/logging-guide.md)** - Unified logging strategy
- **[Testing Plan](docs/guides/testing-plan.md)** - Testing strategy and CI/CD pipeline
- **[Documentation Index](docs/README.md)** - Complete documentation overview

## 🧪 Testing

The project uses Vitest for unit and integration testing. Tests are located alongside source files with the `.test.ts` or `.test.tsx` extension.

**Run tests:**
```bash
npm test
```

**Run tests in watch mode:**
```bash
npm run test:watch
```

**Generate coverage report:**
```bash
npm run test:coverage
```

## 🔧 Development Workflow

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the [Developer Guide](docs/guides/developer-guide.md)

3. **Run tests and linting**:
   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

4. **Commit your changes** using [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: add new feature"
   ```

5. **Push and create a Pull Request**

## 🎯 Current Status

**Phase 1: Core Foundation** - Core authentication and user management complete, ready for level editor

- ✅ Task 1: Project Setup
- ✅ Task 2: User Authentication
- ✅ Task 2.5: Local Authentication (Development)
- ✅ Task 3: Data Models
- ✅ Bugfix: Login Redirect & Password Improvements
- ✅ Feature: User Details Modal & Admin Management
- ✅ Preparation: Store Updates & Level Storage (for Task 4)
- ✅ Task 4: Basic Level Editor
- 🔲 Task 5: Local Storage

See the [Phase 1 Detailed Plan](docs/guides/phase1-detailed-plan.md) for current progress and next steps.

## 🤝 Contributing

This project is designed for parent-child development teams. Please follow the [Developer Guide](docs/guides/developer-guide.md) for:

- Git branching strategy
- Commit message conventions
- Code style and formatting
- Testing requirements
- Documentation standards

## 📝 License

ISC

## 🔗 Links

- **Repository:** [https://github.com/gabe-kai/fcis-platformer](https://github.com/gabe-kai/fcis-platformer)
- **Issues:** [https://github.com/gabe-kai/fcis-platformer/issues](https://github.com/gabe-kai/fcis-platformer/issues)

## 💡 Tips

- Use `npm run dev` to start the development server with hot reload
- Check the browser console for logging output (controlled by `VITE_LOG_LEVEL`)
- Use `npm run test:ui` for an interactive testing experience
- Run `npm run format` before committing to ensure consistent code style

---

**Happy Game Creating! 🎮✨**
