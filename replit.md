# Overview

This is a full-stack password manager application called "Lockify Auto" built with React, Express.js, and PostgreSQL. The application allows users to securely register, login, and manage their password records with strong password validation and encryption. It features a modern UI built with shadcn/ui components and Tailwind CSS, with comprehensive CRUD operations for password management.

## Recent Updates (August 27, 2025)
- **Mobile UI Improvements**: Enhanced mobile responsiveness for password record cards with improved spacing, button sizing, and layout adaptation for small screens
- **Custom Theme Implementation**: Off-white (hsl(35 25% 97%)) background for light mode and off-black (hsl(220 13% 8%)) background for dark mode with matching color scheme adjustments
- **Accessibility Fixes**: Added aria-describedby attributes to dialog components to resolve accessibility warnings
- **Enhanced Mobile Navigation**: Improved search and sort container layout, button groups, and action buttons for better mobile experience

# User Preferences

- Preferred communication style: Simple, everyday language.
- Theme preference: Off-white and off-black theme for dark mode
- Design preference: Compact and simple mobile UI with consistent icons and font styles
- UI focus: Enhanced mobile responsiveness for password record cards

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming support
- **Forms**: React Hook Form with Zod validation resolvers

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **API Design**: RESTful API endpoints with proper error handling middleware
- **Development**: Hot reloading with Vite middleware in development mode

## Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for database migrations and schema management
- **Connection**: Neon Database serverless PostgreSQL connection
- **Fallback Storage**: In-memory storage implementation for development/testing

## Authentication and Authorization
- **User Registration**: Username/password with strong password requirements
- **Password Security**: bcrypt hashing with salt rounds for stored passwords
- **Session Management**: JWT tokens with 24-hour expiration
- **Protected Routes**: Frontend route protection with authentication checks
- **API Security**: Bearer token authentication middleware for API endpoints

## External Dependencies

### Core Frontend Dependencies
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight routing library
- **react-hook-form**: Form handling and validation
- **@hookform/resolvers**: Zod integration for form validation
- **zod**: Runtime type validation and schema definition

### UI and Styling
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant management for components
- **clsx**: Conditional className utility
- **lucide-react**: Icon library

### Backend Dependencies
- **express**: Web application framework
- **drizzle-orm**: Type-safe ORM for PostgreSQL
- **drizzle-kit**: Database toolkit for migrations
- **@neondatabase/serverless**: Serverless PostgreSQL driver
- **jsonwebtoken**: JWT token generation and verification
- **bcryptjs**: Password hashing library

### Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Static type checking
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler for production builds