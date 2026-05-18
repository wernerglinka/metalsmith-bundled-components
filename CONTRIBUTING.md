# Contributing to metalsmith-plugin-name

Thank you for your interest in contributing to this Metalsmith plugin! This document outlines the guidelines and workflows for contributing to this project.

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Use Node.js version specified in `.nvmrc`:
   ```bash
   nvm use
   ```

## Development Workflow

1. Create a branch for your changes:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes, following the coding standards

3. Add tests for your changes

4. Run tests:

   ```bash
   npm test
   ```

5. Run linting:

   ```bash
   npm run lint
   ```

6. Format your code:

   ```bash
   npm run format
   ```

7. Build the package:
   ```bash
   npm run build
   ```

## Commit Message Guidelines

Please follow the conventional commit message format:

- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation changes
- `style:` - Changes that do not affect the meaning of the code (formatting)
- `refactor:` - A code change that neither fixes a bug nor adds a feature
- `perf:` - A code change that improves performance
- `test:` - Adding missing tests or correcting existing tests
- `chore:` - Changes to the build process or auxiliary tools

Example: `feat: add support for custom templates`

## Pull Request Process

1. Update the README.md with details of changes to the interface, if applicable
2. Ensure all tests pass and coverage remains high
3. Update the CHANGELOG.md following the existing format
4. Submit a pull request with a clear description of the changes

## Code Standards

- Follow the ESLint configuration
- Maintain high test coverage (aim for >90%)
- Use JSDoc comments for all functions and types
- Support both ESM and CommonJS
- Follow existing code patterns and naming conventions

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.
