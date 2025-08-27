# TideFly

Smart surf alerts for passionate surfers. Get intelligent surf alerts based on wave height, wind conditions, and your travel preferences.

## Project Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd TideFly
   ```

2. **Install dependencies**
   ```bash
   cd vercel-app
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the `vercel-app` directory with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## Development Workflow

### Opening the Project in Cursor (or any IDE)

1. **Open Cursor**
2. **Open the project folder**
   - File → Open Folder → Select the `TideFly` directory
   - Or use `Ctrl+O` (Windows/Linux) or `Cmd+O` (Mac)

3. **Navigate the project structure**
   - `vercel-app/` - Next.js frontend application
   - `worker/` - Python background worker
   - `supabase/` - Database migrations and policies
   - `docs/` - Project documentation

4. **Start development**
   - Open a terminal in Cursor (`Ctrl+`` ` or `Cmd+`` `)
   - Navigate to `vercel-app` directory
   - Run `npm run dev` to start the development server

### Working on the Project

- **Frontend changes**: Edit files in `vercel-app/app/` and `vercel-app/components/`
- **API routes**: Modify files in `vercel-app/api/`
- **Styling**: Update `vercel-app/app/globals.css` and Tailwind classes
- **Database**: Check `supabase/` directory for migrations and policies

## Git Workflow

### Making Changes and Committing

1. **Check current status**
   ```bash
   git status
   ```

2. **Stage your changes**
   ```bash
   # Stage specific files
   git add filename.js
   
   # Or stage all changes
   git add .
   ```

3. **Commit your changes**
   ```bash
   git commit -m "Description of your changes"
   ```

4. **Push to GitHub**
   ```bash
   git push origin main
   ```

### Best Practices for Commits

- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, etc.)
- Keep commits focused on a single change
- Examples:
  - `Add user authentication page`
  - `Fix responsive design on mobile devices`
  - `Update README with setup instructions`

## Branching Instructions

### Creating a New Branch

1. **Create and switch to a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit them as usual

3. **Push the new branch to GitHub**
   ```bash
   git push -u origin feature/your-feature-name
   ```

### Working with Branches

- **Switch between branches**
  ```bash
  git checkout branch-name
  ```

- **List all branches**
  ```bash
  git branch -a
  ```

- **Delete a local branch** (after merging)
  ```bash
  git branch -d branch-name
  ```

### Merging Changes

1. **Switch to main branch**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Merge your feature branch**
   ```bash
   git merge feature/your-feature-name
   ```

3. **Push the merged changes**
   ```bash
   git push origin main
   ```

## DB API Views

Background jobs read from versioned views: see [docs/api-contracts.md](docs/api-contracts.md).

## Worker

Run the worker from the repository root:

```
python -u -m worker.worker
```
