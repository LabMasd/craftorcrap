# Craft or Crap - User Dashboard Plan

## Overview
Add a free user account system where users can track their activity on the platform.

---

## Features

### 1. My Votes
- See all craft/crap votes they've made
- Filter by verdict (craft/crap/all)
- Shows thumbnail, title, their vote, current score
- Sorted by most recent

### 2. My Saved
- Items they've starred/bookmarked
- Currently in localStorage → move to database
- Can unsave from dashboard
- Quick access to favorites

### 3. My Submissions
- Work they've submitted
- Shows performance stats:
  - Total votes
  - Craft %
  - Crap %
- Edit/delete their submissions

---

## Database Changes

### Update `votes` table
```sql
ALTER TABLE votes ADD COLUMN user_id TEXT REFERENCES users(clerk_id);
```
- Keep fingerprint for anonymous votes
- Add user_id for logged-in votes
- Index on user_id for fast queries

### Create `saved_items` table
```sql
CREATE TABLE saved_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(clerk_id),
  submission_id UUID NOT NULL REFERENCES submissions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, submission_id)
);

CREATE INDEX idx_saved_items_user ON saved_items(user_id);
```

### Update `submissions` table
```sql
-- Already has submitted_by, but need to link to clerk_id
ALTER TABLE submissions ADD COLUMN user_id TEXT REFERENCES users(clerk_id);
```

---

## API Routes

### GET /api/user/votes
Returns user's vote history
```typescript
{
  votes: [
    {
      submission: { id, title, thumbnail_url, total_craft, total_crap },
      verdict: "craft" | "crap",
      created_at: string
    }
  ],
  stats: {
    total_votes: number,
    craft_votes: number,
    crap_votes: number
  }
}
```

### GET /api/user/saved
Returns user's saved items
```typescript
{
  items: [
    { id, title, thumbnail_url, total_craft, total_crap, saved_at }
  ]
}
```

### POST /api/user/saved
Save an item
```typescript
{ submission_id: string }
```

### DELETE /api/user/saved/[id]
Unsave an item

### GET /api/user/submissions
Returns user's submissions with stats
```typescript
{
  submissions: [
    { id, title, thumbnail_url, total_craft, total_crap, created_at }
  ]
}
```

---

## Frontend Pages

### /dashboard
Main user hub with three tabs:
- Votes (default)
- Saved
- Submissions

### Components
- `DashboardNav` - tab navigation
- `VoteHistory` - list of user's votes
- `SavedItems` - list of saved submissions
- `MySubmissions` - list of user's submissions with stats
- `StatCard` - shows vote counts, percentages

---

## UI Flow

### Sign Up / Sign In
- Use existing Clerk components
- Redirect to /dashboard after sign in
- Show "Sign in to track your votes" prompt on main page

### Voting (logged in)
- Vote is linked to user_id
- Show "Voted!" confirmation
- Vote appears in dashboard immediately

### Saving (logged in)
- Star icon saves to database (not localStorage)
- Syncs across devices
- Shows in dashboard

### Submitting (logged in)
- Submission linked to user_id
- Can track performance in dashboard

---

## Migration Strategy

### Phase 1: Database
1. Add new columns
2. Create saved_items table
3. Add indexes

### Phase 2: API Routes
1. Create /api/user/* routes
2. Update vote API to save user_id
3. Update save functionality

### Phase 3: Frontend
1. Create dashboard page
2. Add dashboard components
3. Update star/save to use API when logged in
4. Add sign-in prompts

### Phase 4: Polish
1. Loading states
2. Empty states
3. Error handling
4. Mobile responsive

---

## File Structure

```
app/
  dashboard/
    page.tsx          # Main dashboard
  api/
    user/
      votes/route.ts
      saved/route.ts
      saved/[id]/route.ts
      submissions/route.ts

components/
  dashboard/
    DashboardNav.tsx
    VoteHistory.tsx
    SavedItems.tsx
    MySubmissions.tsx
    StatCard.tsx
```

---

## Estimated Work

1. Database migrations: 15 min
2. API routes: 30 min
3. Dashboard page + components: 45 min
4. Update existing vote/save logic: 20 min
5. Testing & polish: 20 min

**Total: ~2 hours**

---

## Questions to Resolve

1. Should anonymous users still be able to vote? → Yes, keep fingerprint system
2. Migrate existing localStorage saves to database on first login? → Nice to have, can skip for MVP
3. Allow users to delete their submissions? → Yes
4. Show other users' profiles/votes? → No, keep private for now
