# HypeBoard - Stack & Architecture Plan

## Context
Building a web-based collaborative soundboard application where users can:
- Join rooms/channels
- Upload audio files
- Play sounds that everyone in the room hears simultaneously (real-time sync)
- Free tier hosting required

## Proposed Technology Stack

### Backend
- **Runtime**: Node.js (v20 LTS recommended)
- **Framework**: NestJS
  - Provides excellent structure for WebSocket integration
  - Built-in support for dependency injection
  - Easy to scale and maintain
- **Database**: MongoDB Atlas (Free tier: 512MB storage)
  - ODM: Mongoose
  - Storage: GridFS for audio files
- **Real-time Communication**: Socket.IO
  - Required for synchronized playback across clients
  - WebSocket fallback support
  - Room management built-in
- **File Upload**: Multer middleware
- **Validation**: class-validator + class-transformer

### Frontend
**Recommended: Vite + React + TypeScript**
- **Rationale**:
  - Fast development with Vite
  - React is widely adopted, easy to find help
  - TypeScript for type safety shared with backend
  - Lightweight compared to Next.js (better for free hosting)
- **UI Library**: Shadcn/ui (Tailwind CSS based)
  - Modern, customizable components
  - No runtime overhead
- **State Management**: Zustand (lightweight) or TanStack Query
- **WebSocket Client**: Socket.IO client
- **Audio Playback**: Web Audio API (native)

### Storage for Audio Files

**MongoDB GridFS (CHOSEN)**
- Store files directly in MongoDB Atlas free tier (512MB)
- Pros:
  - No external service needed
  - Simple integration with Mongoose
  - Single database for everything
  - Easy to migrate later
- Cons:
  - Shares 512MB quota with metadata (~100-200 sounds at 2-3MB avg)
  - No built-in CDN
  - Slower than dedicated storage services
- Perfect for MVP with small userbase
- Migration path: Can move to Cloudinary/S3 later when scaling

**Alternative Options (for future migration):**
- **Cloudinary**: 25GB free, CDN included, audio optimization
- **Supabase Storage**: 1GB free, S3-compatible
- **AWS S3**: Pay-as-you-go, industry standard

### Application Hosting Options (Free Tier)

**Backend Options:**

1. **Render.com (RECOMMENDED)**
   - Free tier: 512MB RAM, spins down after 15 min inactivity
   - Native support for monorepos
   - WebSocket support included
   - Auto-deploys from Git
   - Supports Node.js natively

2. **Railway.app**
   - $5 free credit monthly
   - Better performance than Render free tier
   - No auto-sleep
   - Good for development phase

3. **Fly.io**
   - Free tier: 3 shared VMs, 160GB bandwidth
   - Better for WebSocket apps (no cold starts)
   - More complex setup

**Frontend Options:**

1. **Vercel (RECOMMENDED)**
   - 100GB bandwidth/month
   - Excellent DX, zero config for Vite
   - Fast global CDN
   - Preview deployments

2. **Netlify**
   - Similar to Vercel, 100GB bandwidth
   - Alternative if Vercel limits reached

3. **Cloudflare Pages**
   - Unlimited bandwidth
   - Requires Cloudflare DNS
   - Slightly more complex setup

### Monorepo Structure

```
hype-soundboard/
├── package.json (root)
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── rooms/
│   │   │   │   ├── rooms.module.ts
│   │   │   │   ├── rooms.gateway.ts (WebSocket)
│   │   │   │   ├── rooms.service.ts
│   │   │   │   └── rooms.controller.ts
│   │   │   ├── sounds/
│   │   │   │   ├── sounds.module.ts
│   │   │   │   ├── sounds.service.ts
│   │   │   │   └── sounds.controller.ts
│   │   │   ├── users/ (optional for MVP)
│   │   │   └── schemas/
│   │   │       ├── room.schema.ts
│   │   │       └── sound.schema.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── services/
│       │   │   └── socket.ts
│       │   └── stores/
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── turbo.json (optional - for build optimization)
└── pnpm-workspace.yaml (or npm workspaces)
```

**Package Manager Recommendation**: pnpm (faster, disk efficient) or npm workspaces

## Architecture Decisions

### Real-time Synchronization Strategy
- **Socket.IO rooms** map to soundboard rooms/channels
- When user triggers sound:
  1. Client emits event: `play-sound` with soundId + userId
  2. Server broadcasts to room: `sound-playing` event with soundId + userId + timestamp
  3. All clients receive event and:
     - Stop any currently playing sound from the same userId (if exists)
     - Play the new sound at synchronized time
     - Allow sounds from different users to play simultaneously
  4. Use `Date.now()` + small delay buffer (50-100ms) for sync
- Each client tracks active sounds by userId to enable per-user sound stopping
- Multiple audio contexts can overlap - only same-user sounds interrupt each other

### Authentication Strategy (MVP)
- **Anonymous users** with auto-generated display names (e.g., "Fox-47", "Eagle-209")
- Store userId in localStorage
- **Global display name**: User can set/change their name (persists across rooms)
- **Per-room nickname**: User can override their global name in specific rooms
- No authentication required to join rooms (anyone with room URL can join)

### Data Models

**Room Schema:**
```typescript
{
  _id: ObjectId,
  name: string,
  slug: string, // URL-friendly
  createdBy: string, // userId
  admins: string[], // userIds with admin privileges (creator is first admin)
  createdAt: Date,
  lastActivity: Date,
  settings: {
    maxSounds: number, // default: 50
    maxFileSize: number, // 5MB
    allowUploads: boolean
  }
}
```

**User Schema (localStorage):**
```typescript
{
  userId: string, // generated UUID
  globalName: string, // user's preferred name (editable)
  roomNicknames: { [roomId: string]: string }, // per-room overrides
  createdAt: Date
}
```

**Sound Schema:**
```typescript
{
  _id: ObjectId,
  roomId: ObjectId,
  name: string,
  fileId: ObjectId, // GridFS file reference
  filename: string, // original filename
  mimeType: string, // audio/mpeg
  fileSize: number, // bytes
  duration: number, // milliseconds
  uploadedBy: string, // userId
  uploadedAt: Date,
  playCount: number
}
```

**GridFS Files:**
- Stored automatically in `fs.files` and `fs.chunks` collections
- Files served via endpoint: `GET /sounds/:soundId/stream`

## MVP Scope (Phase 1)

### Must-Have Features
1. **Room Management**
   - Create new room (generates unique URL)
   - Join room via direct link/slug only (no public directory)
   - Permanent rooms (persist indefinitely)
   - Display active users count in room

2. **User Identity**
   - Auto-generate display name on first visit (e.g., "Wolf-832")
   - Allow users to change global display name (persists across all rooms)
   - Allow users to set per-room nickname (overrides global name in that room only)
   - Store user preferences in localStorage

3. **Sound Management**
   - Upload audio files (MP3 format - max 5MB, kept at original quality)
   - Basic audio editing/trimming:
     - Trim start and end points of audio
     - Preview trimmed version before saving
     - Save trimmed audio (creates new file or overwrites)
   - Display grid of sounds in room
   - Play sound locally (test before sharing)
   - Users can delete their own uploaded sounds
   - Admins can delete any sound in the room

4. **Room Administration**
   - Room creator is automatically the first admin
   - Admins can promote other users to admin
   - Multiple admins allowed per room
   - Admin capabilities:
     - Delete any sound in the room
     - Change room settings
     - Promote other users to admin
   - Admin status shown visually in user list

5. **Real-time Playback**
   - Click button to play sound for everyone in room
   - Synchronized playback across all clients
   - Multiple users can play sounds simultaneously (sounds from different users overlap)
   - Visual feedback (show who played the sound)
   - When user plays a sound, stop any previous sound they were playing (prevents overlap per user only)

6. **Basic UI**
   - Landing page with "Create Room" or "Join Room" options
   - Soundboard grid view with sound cards
   - Upload button with drag-and-drop support
   - User settings panel (edit global name, per-room nickname)
   - Active users list with display names

### Nice-to-Have (Phase 2)
- Sound categories/tags
- Search/filter sounds
- Volume control per sound
- Keyboard shortcuts (hotkeys for sounds)
- User profiles with stats
- Sound favorites
- Play history/analytics
- Audio transcoding for optimization
- Kick/ban users (admin feature)
- Advanced audio editing (fade in/out, normalization, effects)

### Explicitly Out of Scope for MVP
- User authentication
- Private rooms
- Advanced sound effects/filters (reverb, pitch shift, etc.)
- Mobile app
- Video support

## Technical Constraints

### Free Tier Limitations
- **MongoDB Atlas**: 512MB total storage (metadata + audio files)
  - Estimated capacity: ~100-200 sounds at 2-3MB average
  - GridFS overhead: ~10-15% for chunking
- **Render**: Server sleeps after 15 min inactivity (cold start ~30s)
- **Vercel**: 100GB bandwidth/month

### Performance Considerations
- Limit file uploads to 5MB to conserve storage
- Recommend max 2-3MB per file for optimal storage usage
- Limit sounds per room (e.g., 30-50 sounds)
- Implement storage quota warnings
- Monitor database size approaching 512MB limit
- GridFS streams files in chunks (good for memory efficiency)

## Development Phases

### Phase 1: Project Setup
- Initialize monorepo
- Set up NestJS backend with MongoDB connection
- Set up GridFS with Mongoose
- Set up Vite + React frontend
- Basic CI/CD

### Phase 2: Core Backend
- Room CRUD operations
- Sound upload/storage integration
- WebSocket gateway setup
- Room join/leave logic

### Phase 3: Real-time Sync
- Socket.IO room management
- Play sound synchronization
- Broadcast events to room members

### Phase 4: Frontend Implementation
- Room creation/join UI
- Soundboard grid component
- File upload component
- Socket.IO client integration
- Audio playback logic

### Phase 5: Polish & Deploy
- Error handling
- Loading states
- Deploy to Render + Vercel
- Testing with multiple users

## Final Decisions

1. **Audio Format**: MP3 only (max 5MB per file, keep original quality/bitrate)
2. **Room Persistence**: Permanent rooms (no auto-deletion)
3. **Sound Limits**: 30-50 sounds per room (configurable), 5MB max file size
4. **User Identity**: Auto-generated names with ability to set global name + per-room nicknames
5. **Room Discovery**: Direct link only (private by default, no public directory)
6. **Audio Processing**: No transcoding - keep original files
7. **Room Administration**: Multi-admin system - creator is first admin, admins can promote others
8. **Storage**: MongoDB GridFS (simple, single service, easy to migrate later)

## Implementation Roadmap

### Phase 1: Project Scaffolding (Day 1)
- Initialize monorepo with pnpm workspaces
- Set up NestJS backend with TypeScript
- Set up Vite + React + TypeScript frontend
- Configure MongoDB connection to Atlas
- Set up GridFS with multer-gridfs-storage
- Create initial folder structure
- Configure ESLint/Prettier
- Set up test frameworks (Jest, Vitest, Playwright)

### Phase 2: Backend Core (Days 2-3)
- Define Mongoose schemas (Room, Sound)
- Configure GridFS bucket and streaming
- Implement Room CRUD endpoints
  - POST /rooms - create room
  - GET /rooms/:slug - get room details
- Implement Sound endpoints
  - POST /rooms/:roomId/sounds - upload sound (Multer + GridFS)
  - GET /rooms/:roomId/sounds - list sounds
  - GET /sounds/:soundId/stream - stream audio file
  - PUT /sounds/:soundId/trim - trim audio (with start/end timestamps)
  - DELETE /sounds/:soundId - delete sound from GridFS (with permission check)
- Implement admin endpoints
  - POST /rooms/:roomId/admins - promote user to admin
  - GET /rooms/:roomId/admins - list admins
- Implement storage monitoring endpoint
  - GET /storage/usage - check remaining quota

### Phase 3: WebSocket Real-time (Days 3-4)
- Set up Socket.IO gateway
- Implement socket events:
  - `join-room` - user joins room
  - `leave-room` - user leaves room
  - `play-sound` - trigger sound playback (with userId)
  - `sound-playing` - broadcast to room (with soundId, userId, timestamp)
  - `user-joined` / `user-left` - broadcast user activity
  - `update-display-name` - broadcast name changes
- Handle room membership tracking
- Implement synchronized playback logic with per-user sound tracking

### Phase 4: Frontend UI (Days 5-6)
- Create routing (landing, room pages)
- Landing page:
  - Create room form
  - Join room form (enter slug)
- Room page:
  - Soundboard grid component
  - Sound card component (play button, name, delete button, edit button)
  - Upload component (drag-and-drop)
  - Audio editor modal/component:
    - Waveform visualization
    - Start/end trim handles
    - Preview playback
    - Save trimmed version
  - Active users sidebar
  - User settings modal (global name, room nickname)
  - Admin controls panel (if user is admin)
- Implement Socket.IO client
- Implement Web Audio API playback with per-user sound tracking
  - Track currently playing sounds by userId
  - Stop previous sound when same user plays new one
  - Allow simultaneous playback from different users
- Add localStorage for user preferences

### Phase 5: Integration & Testing (Day 7)
- **Create automated test suite** (Jest/Vitest for unit tests, Playwright/Cypress for e2e)
  - Backend API tests (room creation, sound upload, admin permissions)
  - WebSocket event tests (playback synchronization, user events)
  - Frontend component tests
  - e2e tests for critical flows
  - Run tests via terminal: `pnpm test` (backend), `pnpm test:e2e` (e2e)
  - **Note**: Tests should be runnable locally via terminal to avoid token waste
- Manual testing with multiple browser tabs
- Test synchronization accuracy
- Error handling and loading states
- Responsive design tweaks
- Test file upload limits
- Test admin permissions

### Phase 6: Deployment (Day 8)
- Deploy backend to Render.com
- Deploy frontend to Vercel
- Configure environment variables
- Test production deployment
- Monitor cold start performance

### Phase 7: Polish & Documentation (Day 9)
- Add README with setup instructions
- Add basic error messages and user feedback
- Performance optimization
- Final testing with multiple users

## Test Suite

### Automated Tests
- **Location**: `packages/backend/test/` and `packages/frontend/test/`
- **Framework**: Jest (backend) + Vitest (frontend) + Playwright (e2e)
- **Run via terminal**:
  - `pnpm test` - run all tests
  - `pnpm test:backend` - backend unit/integration tests
  - `pnpm test:frontend` - frontend component tests
  - `pnpm test:e2e` - end-to-end tests
- **CI/CD**: Tests run automatically on git push
- **Note**: Tests should be executable via terminal to avoid token waste during development

### Test Coverage Goals
- Backend API endpoints: 80%+ coverage
- WebSocket events: Critical paths covered
- Frontend components: Key user flows covered
- e2e: Happy path + critical error scenarios

## Verification Testing (Manual)

After implementation, manually test the following scenarios:

1. **Room Creation & Joining**
   - Create a new room - verify unique slug generated
   - Join room via direct link
   - Verify room persists after refresh

2. **User Identity**
   - Verify auto-generated name appears
   - Change global display name - verify persists across rooms
   - Set per-room nickname - verify overrides global name
   - Join different room - verify correct name displayed

3. **Sound Upload & Management**
   - Upload MP3 file (< 5MB) - verify success
   - Upload file > 5MB - verify rejection
   - Upload non-MP3 - verify rejection
   - Delete own sound - verify success
   - Try to delete others' sound as non-admin - verify blocked
   - As admin, delete any sound - verify success

4. **Real-time Playback**
   - Open room in 2+ browser tabs/devices
   - Play sound from one tab
   - Verify all tabs play sound simultaneously (within ~100ms)
   - Verify visual feedback shows who played sound
   - Rapidly play different sounds from same user - verify previous sound stops
   - Play sounds from different users simultaneously - verify both play (no stopping)
   - Test 3+ users playing sounds at once - verify all sounds overlap correctly

5. **Sound Editing**
   - Upload a sound and open editor
   - Verify waveform displays correctly
   - Trim start and end points
   - Preview trimmed version
   - Save trimmed sound - verify plays correctly for all users
   - Verify trimmed sound respects file size limits

6. **Admin Features**
   - Verify room creator has admin badge
   - Promote another user to admin - verify badge appears
   - As admin, delete any sound - verify success
   - As admin, change room settings - verify persists

7. **Edge Cases**
   - Test with slow network connection
   - Test with server cold start (after 15 min inactivity on Render)
   - Test room with 50+ sounds
   - Test concurrent uploads
   - Test disconnection/reconnection handling

## Success Criteria

MVP is complete when:
- ✅ Users can create and join rooms via direct link
- ✅ Users can upload MP3 files up to 5MB
- ✅ Users can trim/edit uploaded sounds
- ✅ Users can play sounds that sync across all connected clients
- ✅ Multiple users can play sounds simultaneously (sounds overlap)
- ✅ Same user playing multiple sounds stops previous sound
- ✅ Users can set global and per-room display names
- ✅ Room creators can promote admins
- ✅ Admins can moderate sounds
- ✅ **Automated test suite exists and passes** (runnable via `pnpm test`)
- ✅ Application is deployed and accessible via public URLs
- ✅ Real-time sync latency is under 200ms on average

## Next Steps

Ready to begin implementation following this plan!
