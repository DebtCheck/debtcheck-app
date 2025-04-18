# DebtCheck - Frontend (Next.js)

DebtCheck is a platform designed to help teams analyze and manage technical debt in their codebases. The frontend is built using **Next.js** and interacts with the backend Rust microservice to provide users with a detailed, actionable report on their technical debt.

## Features

- User-friendly interface for managing GitHub repositories.
- Displays detailed reports on technical debt issues such as outdated dependencies, dead code, code smells, security risks, and more.
- Seamlessly integrates with the backend services to provide real-time insights.

## Prerequisites

- Node.js (v14 or later)
- npm or yarn package manager
- GitHub account (for integration)

## Setup

1. Clone the repository:

    ```bash
    git clone https://github.com/your-org/debtcheck-frontend.git
    cd debtcheck-frontend
    ```

2. Install dependencies:

    If using `npm`:

    ```bash
    npm install
    ```

    Or, if using `yarn`:

    ```bash
    yarn install
    ```

3. Configure environment variables:

    Create a `.env.local` file in the root of the project and add your environment variables:

    ```env
    NEXT_PUBLIC_GITHUB_API_URL=https://api.github.com
    NEXT_PUBLIC_DEBTCHECK_API_URL=https://api.debtcheck.com
    ```

4. Run the development server:

    ```bash
    npm run dev
    ```

    Or, if using `yarn`:

    ```bash
    yarn dev
    ```

    This will start the development server at `http://localhost:3000`.

## Development

To contribute to the project:

- **Create a feature branch**:  

    ```bash
    git checkout -b feature/new-feature
    ```

- **Run tests**:  
    Before pushing your changes, ensure all tests pass:

    ```bash
    npm run test
    ```

- **Push your branch**:  

    ```bash
    git push origin feature/new-feature
    ```

- **Open a pull request** to the `main` branch for review.

## Testing

The project uses Jest for testing. You can run the tests with:

```bash
npm run test
