# SMS Web Management System

A modern web-based SMS data management system built with Vue 3, TypeScript, and Vite. Features secure OAuth2 authentication via Keycloak and a responsive UI using shadcn-vue components.

## 🚀 Features

- **Modern Vue 3** with Composition API and TypeScript
- **OAuth2 Authentication** with Keycloak integration
- **Responsive Design** with dark/light theme support
- **State Management** using Pinia
- **HTTP Client** with Axios and automatic token refresh
- **UI Components** using shadcn-vue and TailwindCSS
- **Icon Library** with Lucide Vue Next
- **Form Validation** with Vee-Validate and Zod

## 📋 Prerequisites

Before running this project, ensure you have:

- **Node.js** (v18 or higher)
- **Bun** package manager
- **Keycloak Server** configured and running

## 🔧 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd sms-web-manage
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Environment Setup**

   Create a `.env` file in the root directory:

   ```env
   VITE_API_BASE_URL_AUTH=http://localhost:3000
   VITE_API_BASE_URL_DATA=http://localhost:3000
   VITE_APP_NAME=SMS Data Management
   VITE_APP_VERSION=1.0.0
   VITE_APP_MODE=development
   ```

## 🚀 Running the Application

### Development Mode

```bash
bun run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
bun run build
```

### Preview Production Build

```bash
bun run preview
```

## 🔐 Authentication Setup

This application requires a Keycloak server for OAuth2 authentication. Configure the following endpoints in your Keycloak:

### API Endpoints

- **Authorization**: `POST /v1/oauth2/authorize`
- **Token Exchange**: `POST /v1/oauth2/callback`
- **Session Check**: `GET /v1/auth/session`
- **Logout**: `POST /v1/oauth2/logout`

### Keycloak Configuration

1. Create a new client in Keycloak
2. Set the client to use Authorization Code flow with PKCE
3. Configure redirect URIs to include your application URL
4. Update the `VITE_API_BASE_URL_AUTH` environment variable

## 📁 Project Structure

```
src/
├── components/          # Vue components
│   ├── ui/             # shadcn-vue UI components
│   └── ModeToggle.vue  # Theme switcher
├── composables/        # Vue composables
├── layouts/            # Layout components
├── lib/                # Utility libraries
│   ├── constants.ts    # Application constants
│   ├── env.ts         # Environment variables
│   └── utils.ts       # Utility functions
├── router/             # Vue Router configuration
├── stores/             # Pinia stores
│   ├── api.ts         # API client configuration
│   └── auth.ts        # Authentication store
├── types/              # TypeScript type definitions
└── views/              # Page components
    ├── HomeView.vue
    ├── LoginView.vue
    └── ...
```

## 🛠 Technology Stack

- **Frontend Framework**: Vue 3 with TypeScript
- **Build Tool**: Vite
- **Package Manager**: Bun
- **State Management**: Pinia
- **Routing**: Vue Router
- **HTTP Client**: Axios
- **UI Framework**: TailwindCSS
- **Component Library**: shadcn-vue
- **Icons**: Lucide Vue Next
- **Form Validation**: Vee-Validate + Zod
- **Authentication**: OAuth2 with Keycloak

## 🎨 UI Components

This project uses [shadcn-vue](https://www.shadcn-vue.com/) for UI components, which provides:

- Consistent design system
- Dark/light theme support
- Fully customizable components
- Accessibility-first approach
