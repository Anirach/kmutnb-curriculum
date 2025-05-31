# KMUTNB Curriculum System

This project is a web-based platform for managing and sharing curriculum documents and resources at KMUTNB. It integrates with Google Drive for secure file storage and sharing, and provides role-based access for administrators, editors, and viewers.

## Features
- Google Drive integration for file and folder management
- Role-based access control (Admin, Editor, Viewer)
- Upload, download, rename, and delete files and folders
- Search functionality across folders and subfolders
- User management for administrators
- Responsive dashboard interface

## Documentation
- User and admin manuals are available in the `Document/UserDoc` folder.

## Requirements
- Node.js
- Google OAuth credentials (Client ID/Secret) with appropriate Drive API scopes

## Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure Google OAuth credentials
4. build the project: `npm run build`
5. Start the development server: `npm sart`

For more details, see the manuals in `Document/UserDoc`.

## Project info

**URL**: https://lovable.dev/projects/26f5d5e9-7230-4abd-959a-71934d98650c

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/26f5d5e9-7230-4abd-959a-71934d98650c) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/26f5d5e9-7230-4abd-959a-71934d98650c) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
