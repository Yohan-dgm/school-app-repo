# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `yarn start` or `expo start`
- **Run on Android**: `yarn android` or `expo start --android`
- **Run on iOS**: `yarn ios` or `expo start --ios`
- **Run on Web**: `yarn web` or `expo start --web`
- **Lint code**: `yarn lint` or `eslint .`
- **Test**: Tests are configured with Jest (`__tests__/` directory)

## Project Architecture

This is a React Native Expo app for a school management system built with Expo Router and TypeScript.

### Tech Stack

- **Framework**: React Native with Expo SDK 53
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Redux Toolkit with RTK Query for API calls
- **UI Styling**: NativeWind (Tailwind CSS for React Native) + React Native Paper
- **Persistence**: Redux Persist with AsyncStorage
- **Development**: TypeScript, ESLint, Prettier

### Directory Structure

```
src/
├── app/                    # Expo Router pages (file-based routing)
│   ├── authenticated/      # Protected routes for logged-in users
│   ├── public/            # Public routes (login, etc.)
│   └── unauthenticated/   # Auth-related routes
├── api/                   # RTK Query API definitions
├── components/            # Reusable UI components
│   ├── common/           # Universal components used across user types
│   ├── ui/               # Base UI components (buttons, inputs, etc.)
│   └── [feature]/        # Feature-specific components
├── constants/            # App constants (user categories, themes, etc.)
├── context/              # React Context providers
├── state-store/          # Redux store configuration
│   ├── slices/           # Redux slices
│   └── middleware/       # Custom middleware
├── config/               # App configuration
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
├── styles/               # Theme and styling configurations
└── types/                # TypeScript type definitions
```

### Key Architecture Patterns

## intial loading splash screen

- if not internet connection to phone dont load app , it need show as loading still until mobile data or wifi on.

#### User Category System

The app supports 12 distinct user categories with role-based navigation:

- Parent, Educator, Senior Management, Principal, Management, Admin
- Sport Coach, Counselor, Student, Toyar Team, Security, Canteen

User categories are defined in `src/constants/userCategories.ts` and drive:

- Navigation configuration (`src/config/navigationConfig.ts`)
- Route access (`src/app/authenticated/[userCategory]/`)
- Component visibility and permissions

#### State Management

- **Redux Store**: Configured in `src/state-store/store.ts`
- **RTK Query**: API layer with base configuration in `src/api/api-server-1.ts`
- **Slices**: Domain-specific state (calendar, posts, user management, etc.)
- **Persistence**: User authentication and app state persist across sessions

#### Navigation Architecture

- **Expo Router**: File-based routing with TypeScript support
- **Dynamic Navigation**: User category determines available tabs/screens
- **Authentication Flow**: Public → Login → Role-based dashboard

#### API Integration

- **Base URL**: Configured via `EXPO_PUBLIC_BASE_URL_API_SERVER_1` environment variable
- **Authentication**: Bearer token from Redux state
- **Error Handling**: Global RTK Query error middleware
- **Caching**: RTK Query handles caching and invalidation

### Component Patterns

#### Universal Components

Located in `src/components/common/`, these components adapt behavior based on user category:

- `UniversalActivityFeed.tsx`: Activity feed with role-based tabs
- `UniversalDrawerMenu.tsx`: Navigation drawer with category-specific options
- `CommonSchoolCalendar.tsx`: Calendar component for all user types

#### UI Components

Base components in `src/components/ui/` follow a consistent pattern:

- Prefixed with "T" (e.g., `TButton.tsx`, `TInput.tsx`)
- Support both light and dark themes
- Built with NativeWind styling

### Environment Configuration

- Development/production environment detection
- Expo environment variables for API endpoints
- Reactotron integration for development debugging

### Testing Strategy

- Jest configuration for unit tests
- Test files in `__tests__/` directory
- API integration tests in component directories

### Platform Support

- **iOS**: Native iOS app via Expo
- **Android**: Native Android app via Expo
- **Web**: React Native Web compatibility configured in Metro

### Key Files to Understand

- `src/app/_layout.tsx`: Root app layout with providers
- `src/state-store/store.ts`: Redux store configuration
- `src/constants/userCategories.ts`: User role definitions
- `src/config/navigationConfig.ts`: Navigation structure per user type
- `src/api/api-server-1.ts`: RTK Query base API configuration

## Rules

- First think through the problem, read the codebase for relevant files, and write a plan to projectplan.nd
- The plan should have a list of todo items that you can check off as you complete then
- Before you begin working, check in with me and I will verify the plan
- Then, begin working on the todo items, marking them as complete as you go
- Please every step of the way just give me a high level explanation of what changes you made
- Make every task and code change you do as simple as possibl. We want to avoid making any massive or complex change. Every change should impact as little code as possibl. Everything is about simplicity
- Finally, add a review section to the projectplan.nd file with a summary of the changes you made and any other relevant information

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
