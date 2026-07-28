# UMKM Commerce Platform (UCP)

Multi-tenant, modular e-commerce platform for UMKM in Indonesia built with NestJS, Next.js, and Prisma in a Turborepo monorepo.

## Quick Start (Development)

1. **Clone repository**:
   ```bash
   git clone <repo-url>
   cd e-commerce
   ```

2. **Setup environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Start Docker services** (PostgreSQL, Redis, MinIO):
   ```bash
   docker compose -f docker/docker-compose.dev.yml up -d
   ```

5. **Run Database Migrations & Seeds**:
   ```bash
   pnpm --filter database migrate:dev
   pnpm --filter database seed
   ```

6. **Start all apps in development mode**:
   ```bash
   pnpm dev
   ```

## Repository Structure

- `apps/api`: NestJS backend (Modular Monolith)
- `apps/storefront`: Next.js App Router for customer-facing store
- `apps/admin`: Next.js App Router for tenant & platform admin dashboard
- `packages/database`: Prisma schema & generated client
- `packages/types`: Shared TypeScript interfaces & DTO definitions
- `packages/ui`: Shared React components library
- `packages/config`: Shared TSConfig, ESLint, & Prettier base configs
- `packages/utils`: Shared utility functions

## Available Scripts

- `pnpm dev`: Start all apps concurrently
- `pnpm build`: Build all apps and packages
- `pnpm lint`: Run ESLint across all workspaces
- `pnpm type-check`: Run TypeScript type-checking across all workspaces
- `pnpm format`: Format all files with Prettier
