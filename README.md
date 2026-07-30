# Whatsappi - Standalone Chat Frontend for PubSub (pubsub.nextmark.ae)

A lightweight, standalone frontend chat application that connects to your pubsub socket server using socket-based authentication.

## Features

- **Pure Frontend** - No backend required, all logic runs in the browser
- **Socket Authentication** - Uses Pusher.js for WebSocket connections
- **Real-time Chat** - Live messaging across multiple connected apps
- **Persistent Sessions** - Auto-reconnect via localStorage
- **Dark Mode** - Built-in theme switching
- **Responsive UI** - Works on desktop and mobile

## Setup

### Prerequisites
- Node.js 16+ and npm
- A pubsub server (pubsub.nextmark.ae)

### Installation

```bash
npm install
```

### Configuration

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` with your settings.

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`

### Production Build

```bash
npm run build
```

Built files in `dist/` - serve with any static server:

```bash
npm run preview
```

## Usage

1. Start the app with `npm run dev`
2. Configure your apps:
   - **Via Settings UI**: Click Settings tab → Add app
   - **Via URL**: Share a link with encoded config (settings/config query params)
3. Enter your socket credentials (username/password) in the auth dialog
4. Start chatting!

## Architecture

```
whatsappi/
├── src/
│   ├── chat/              # Chat UI components and context
│   │   ├── _components/   # React components
│   │   ├── _context/      # Context providers (Socket, Chats, etc.)
│   │   └── _hooks/        # Custom hooks
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   ├── chatbot/       # Chat UI helpers
│   │   └── theme-provider.tsx
│   ├── lib/               # Utilities (color, formatters, etc.)
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # React entry point
│   └── index.css          # Tailwind styles
├── index.html             # HTML entry point
├── vite.config.ts         # Vite config
├── .env.local             # Local config (gitignored)
└── package.json
```

## How It Works

1. **Initialization**: App loads config from the Settings UI, shared URL settings, or localStorage
2. **Connection**: Uses Pusher.js to connect to socket server
3. **Authentication**: Custom auth handler sends username/password
4. **Real-time Sync**: Listens for messages on configured channels
5. **Persistence**: Stores session tokens for auto-reconnect

## Troubleshooting

### Connection Failed
- Verify socket server is running
- Ensure credentials are correct
- Check browser console for detailed errors

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules dist .vite
npm install
npm run build
```

### Module Not Found Errors
- Ensure all `.env` variables are set
- Check that `vite.config.ts` paths alias is correct (`@/`)
- Verify UI components are in `src/components/ui/`

## Deployment

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

### Static Hosting (Netlify, Vercel, etc.)
1. Build: `npm run build`
2. Deploy `dist/` folder
3. Set environment variables in hosting platform

## License

MIT
