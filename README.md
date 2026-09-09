# Brightride Laundry Hub

Clone this repo https://github.com/daveprinter/brightride-laundry.git using the exact below code style and import also the whole supabase and backend everything,,# Clone into a temporary directory.

git clone https://github.com/daveprinter/brightride-laundry.git /tmp/derivgoat



# Inspect structure.

ls -la /tmp/derivgoat



# Copy application source and public assets.

cp -r /tmp/derivgoat/src ./

cp -r /tmp/derivgoat/public ./



# Copy project configuration files.

cp /tmp/derivgoat/package.json    /tmp/derivgoat/bun.lock    /tmp/derivgoat/bunfig.toml    /tmp/derivgoat/components.json    /tmp/derivgoat/eslint.config.js    /tmp/derivgoat/tsconfig.json    /tmp/derivgoat/vite.config.ts    /tmp/derivgoat/AGENTS.md    /tmp/derivgoat/.prettierrc    /tmp/derivgoat/.prettierignore ./



# Copy Lovable-specific configuration.

cp -r /tmp/derivgoat/.lovable ./



# Install dependencies.

bun install

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bd4562bd-425f-4e9a-9dc5-af4e603e5c28).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
