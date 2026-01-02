# Contributing to Observability Dashboard

Thank you for your interest in contributing to the Observability Dashboard! We appreciate your time and effort in helping improve this project.

## Code Style

- Follow the existing code style in the project
- Use 4 spaces for indentation (no tabs)
- Use single quotes for strings
- Include semicolons at the end of statements
- Keep lines under 100 characters when possible
- Add comments for complex logic
- Write meaningful variable and function names

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- Use the present tense ("Add feature" not "Added feature")
- Start with a type: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`
- Keep the first line under 50 characters
- Include a blank line between the subject and body
- Use the body to explain what and why, not how
- Reference issues and pull requests at the end

Example:
```
feat: add dark mode support

Add a new theme toggle component and implement dark mode styling across the dashboard.
Closes #123
```

## Pull Requests

1. Fork the repository and create your branch from `main`
2. Run `npm install` to install dependencies
3. Make your changes, following the code style
4. Add tests if applicable
5. Run tests with `npm test`
6. Update the documentation if needed
7. Ensure the test suite passes
8. Submit a pull request with a clear description

### PR Guidelines

- Keep pull requests focused on a single feature or fix
- Reference any related issues in your PR description
- Include screenshots for UI changes
- Ensure all tests pass before submitting
- Update documentation as needed

## Development Setup

### Prerequisites

- Node.js 14+
- npm 6+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/observability-js.git
cd observability-js

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Testing

Run the test suite:
```bash
npm test
```

### Linting

Check code style:
```bash
npm run lint
```

## Reporting Issues

When creating an issue, please include:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected vs actual behavior
4. Browser/Node.js version
5. Any error messages or logs
6. Screenshots if applicable

## Code of Conduct

We are committed to providing a friendly, safe, and welcoming environment for all. Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

## Author

👤 **Anastasios Bolkas**

- GitHub: [@anastasios-b](https://github.com/anastasios-b)
- Portfolio: [anastasios-bolkas.tech](https://anastasios-bolkas.tech)
