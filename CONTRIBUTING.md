# Contributing to RepoSignal Backend

Thank you for your interest in contributing to RepoSignal Backend! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Bun** (v1.0 or higher) - [Install Bun](https://bun.sh)
- **PostgreSQL** (v14 or higher)
- **Git**

### Fork and Clone

1. Fork the repository on GitHub

## Development Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/reposignal

# Bot API Key (for bot authentication)
BOT_API_KEY=your_secure_bot_api_key

# GitHub OAuth (for user authentication)
GITHUB_OAUTH_CLIENT_ID=your_github_oauth_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_OAUTH_CALLBACK_URL=http://localhost:5000/auth/github/callback

# Session Secret (for session management)
SESSION_SECRET=your_secure_session_secret

# GitHub App (for GitHub integration)
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_PRIVATE_KEY=your_github_app_private_key
GITHUB_APP_NAME=your_github_app_name

# Optional Configuration
SETUP_WINDOW_MINUTES=10
CORS_ORIGIN=http://localhost:3000
COOKIE_DOMAIN=localhost
REDIRECT_URL_FRONTEND=http://localhost:3000
```

> **Note:** Never commit your `.env` file. It should be listed in `.gitignore`.

## Database Setup

### 1. Create PostgreSQL Database

First, ensure PostgreSQL is running on your machine. Then create a new database:

```bash
# Using psql command line
psql -U postgres

# Inside psql:
CREATE DATABASE reposignal;
\q
```

Alternatively, use a GUI tool like pgAdmin or TablePlus.

### 2. Configure Database Connection

Update your `.env` file with your PostgreSQL connection details:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/reposignal
```

Replace:
- `username` with your PostgreSQL username
- `password` with your PostgreSQL password
- `localhost:5432` with your database host and port
- `reposignal` with your database name

### 3. Generate and Run Migrations

This project uses Drizzle ORM for database management.

```bash
# Generate migrations from schema
bun run db:generate

# Apply migrations to database
bun run db:migrate

# Push schema directly to database (alternative to migrate)
bun run db:push

# Seed the database with initial data
bun run db:seed

# Complete setup (push + seed)
bun run db:setup

# Open Drizzle Studio (database GUI)
bun run db:studio
```

### 4. Verify Database Setup

Check that your tables have been created successfully by connecting to your database:

```bash
psql -U username -d reposignal -c "\dt"
```

## Running the Application

### Development Mode

Start the development server with hot-reload:

```bash
bun run dev
```

The server should start at `http://localhost:5000` (or the port specified in your `.env` file).

### Production Build

```bash
# Start the production server
bun start
```

## Making Changes

### 1. Create a Feature Branch

Always create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - for new features
- `fix/` - for bug fixes
- `docs/` - for documentation updates
- `refactor/` - for code refactoring
- `test/` - for adding or updating tests

### 2. Make Your Changes

- Write clean, readable code
- Follow the existing code style
- Add comments for complex logic
- Update documentation if necessary

### 3. Database Schema Changes

If you modify the database schema:

1. Update the schema files in `src/db/schema/`
2. Generate new migrations:
   ```bash
   bun run db:generate
   ```
3. Test the migrations locally:
   ```bash
   bun run db:migrate
   ```
4. Commit both the schema changes and generated migration files

## Submitting a Pull Request

### 1. Update Your Branch

Before submitting, ensure your branch is up to date with the main branch:

```bash
git fetch upstream
git rebase upstream/main
```

If there are conflicts, resolve them and continue:

```bash
git rebase --continue
```

### 2. Push Your Changes

```bash
git push origin feature/your-feature-name
```

### 3. Create a Pull Request

1. Go to the repository on GitHub
2. Click "New Pull Request"
3. Select your branch
4. Fill out the PR template with:
   - **Title**: Clear, concise description of changes
   - **Description**: Detailed explanation of what and why
   - **Related Issues**: Reference any related issues (e.g., "Closes #123")
   - **Testing**: Describe how you tested your changes
   - **Screenshots**: Include if applicable (for UI changes)

### 4. PR Review Process

- Maintainers will review your PR
- Address any feedback or requested changes
- Update your PR by pushing new commits to your branch
- Once approved, a maintainer will merge your PR

### PR Checklist

Before submitting, ensure:

- [ ] Code follows the project's style guidelines
- [ ] Tests have been added/updated and pass
- [ ] Documentation has been updated (if necessary)
- [ ] Commit messages follow the commit guidelines
- [ ] No merge conflicts with main branch
- [ ] All checks and CI/CD pipelines pass

## Code Style Guidelines

### TypeScript/JavaScript

- Use **TypeScript** for all new code
- Use **ES6+ syntax**
- Use **async/await** instead of callbacks
- Use **camelCase** for variables and functions
- Use **PascalCase** for classes and types
- Use **UPPER_CASE** for constants
- Avoid `any` type; use proper typing
- Use meaningful variable and function names

### Formatting

- **Indentation**: 2 spaces (or tabs, depending on project config)
- **Line length**: Max 100 characters
- **Semicolons**: Use them consistently
- **Quotes**: Use single quotes for strings (unless otherwise configured)

Run the linter to check your code:

```bash
bun run lint

# Auto-fix linting issues
bun run lint:fix
```

### File Organization

- Keep files focused and single-purpose
- Group related functionality in modules
- Use index files for clean exports
- Follow the existing directory structure

## Commit Message Guidelines

Write clear, descriptive commit messages following the conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates

### Examples

```bash
feat(auth): add GitHub OAuth authentication

fix(database): resolve connection pool timeout issue

docs(readme): update installation instructions

refactor(api): simplify error handling logic
```

### Best Practices

- Use present tense ("add feature" not "added feature")
- Keep the subject line under 50 characters
- Capitalize the subject line
- Don't end the subject line with a period
- Use the body to explain what and why (not how)
- Reference issues and PRs in the footer

## Additional Resources

- [Setup Guide](docs/SETUP_GUIDE.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Testing Guide](docs/TESTING_GUIDE.md)
- [Error Handling](docs/ERROR_HANDLING.md)

## Questions?

If you have questions or need help:

1. Check existing documentation
2. Search existing issues
3. Open a new issue with the "question" label
4. Reach out to maintainers

Thank you for contributing to RepoSignal Backend! 🎉
