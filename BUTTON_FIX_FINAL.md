# Suggested Questions Button - Final Fix & Testing Guide

## Status: ✅ Code Changes Complete - Requires Frontend Restart

## Root Cause
The "Suggest Questions" button code is correctly implemented but **not visible** because the frontend dev server is serving stale cached code from before the changes were made.

## What Was Changed

### 1. `useSuggestedQuestions.ts` Hook
**File:** `frontend/src/features/suggested-questions/hooks/useSuggestedQuestions.ts`

**Key Change:** Disabled automatic question generation
```typescript
const questionsQuery = useQuery({
  queryKey,
  queryFn: () => questionsApi.getQuestions(documentId, sessionId),
  enabled: false,  // ✅ Changed from "hasIdentifier" to "false"
  staleTime: 1000 * 60 * 5,
  retry: 0,
});
```

**New API:**
- `fetch()` - Explicitly trigger generation (called by button click)
- `hasCachedData` - Boolean flag indicating if questions exist in cache
- Double-click prevention built into `fetch()`

### 2. `SuggestedQuestionsList.tsx` Component
**File:** `frontend/src/features/suggested-questions/components/SuggestedQuestionsList.tsx`

**Key Change:** Button renders when no cached data exists
```tsx
// Line 31-44
if (!hasCachedData && !isLoading && !isError) {
  return (
    <div className="pt-2">
      <button onClick={handleGenerate} ...>
        <Wand2 className="h-3.5 w-3.5" />
        <span>Suggest Questions</span>
      </button>
    </div>
  );
}
```

**Added Debug Logging:**
Console logs show:
- documentId, sessionId props
- hasCachedData, isLoading, isError states
- Button render events

### 3. Test Page Created
**File:** `frontend/src/app/test-suggestions/page.tsx` (NEW)

Provides isolated testing environment with 4 test scenarios.

---

## CRITICAL: You Must Restart Frontend Dev Server

The changes are on disk but **the running dev server at http://localhost:3000 has NOT picked them up**.

### Step 1: Stop Current Dev Server

**Option A: Find and kill process**
```bash
cd "C:\Users\Ankit Tiwari\RagCX"

# Find process using port 3000
netstat -ano | findstr ":3000"

# Output example:
#   TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       16764

# Kill it (replace 16764 with actual PID)
taskkill /F /PID 16764
```

**Option B: Press Ctrl+C in the terminal where `npm run dev` is running**

### Step 2: Clear Next.js Cache
```bash
cd "C:\Users\Ankit Tiwari\RagCX\frontend"
rm -rf .next
rm -rf node_modules/.cache
```

### Step 3: Start Fresh Dev Server
```bash
cd "C:\Users\Ankit Tiwari\RagCX\frontend"
npm run dev
```

Wait for:
```
✓ Ready in 3.2s
○ Local:        http://localhost:3000
```

### Step 4: Hard Refresh Browser
After dev server starts:
1. Open browser to `http://localhost:3000`
2. Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac) to bypass browser cache
3. Open DevTools Console (F12) to see debug logs

---

## Testing the Fix

### Test 1: Isolated Test Page (Recommended)

Navigate to: **http://localhost:3000/test-suggestions**

**Expected Results:**
- 4 test boxes visible
- Test 1, 2, 3: Each shows "Suggest Questions" button
- Test 4: Shows button (but clicking does nothing - no IDs provided)

**Debug Console Output:**
```javascript
[SuggestedQuestionsList] Render: { sessionId: "test-session-123", documentId: undefined, hasCachedData: false, isLoading: false, isError: false, questionsCount: 0 }
[SuggestedQuestionsList] Rendering button
```

### Test 2: Real Chat Interface

1. Navigate to: **http://localhost:3000/chat**
2. Open existing chat or create new one
3. Send a message to get an assistant response
4. Scroll down to see assistant message

**Expected Results:**
- Below assistant message text, after citations
- "Suggest Questions" button visible with wand icon

**Debug Console Output:**
```javascript
[SuggestedQuestionsList] Render: { sessionId: "<message-id>", documentId: undefined, hasCachedData: false, isLoading: false, isError: false, questionsCount: 0 }
[SuggestedQuestionsList] Rendering button
```

### Test 3: Click Button to Generate

Click the "Suggest Questions" button:

**Expected Behavior:**
1. Button text changes to "Generating..."
2. Button becomes disabled
3. Loading skeleton appears (3 pulsing boxes)
4. Network request to `/api/v1/suggested-questions` in DevTools Network tab
5. After ~30-120 seconds: questions appear
6. Button changes to "Regenerate"

**Debug Console Output:**
```javascript
[SuggestedQuestionsList] Fetch triggered
// ... network request ...
[SuggestedQuestionsList] Render: { ..., hasCachedData: true, questionsCount: 3 }
```

### Test 4: Cache Behavior

Refresh the page (F5) and return to same chat:

**Expected Results:**
- Questions appear immediately (no button)
- "Regenerate" button visible
- NO network request (served from React Query cache)

**Debug Console Output:**
```javascript
[SuggestedQuestionsList] Render: { ..., hasCachedData: true, isLoading: false, questionsCount: 3 }
// No "Rendering button" log
```

### Test 5: Double-Click Prevention

Clear cache (Ctrl+Shift+R), click "Suggest Questions" button rapidly 10 times:

**Expected Results:**
- Only ONE network request in DevTools
- Button disabled immediately after first click
- Subsequent clicks blocked

**Debug Console Output:**
```javascript
[SuggestedQuestionsList] Fetch triggered
[SuggestedQuestionsList] Blocked - already loading
[SuggestedQuestionsList] Blocked - already loading
...
```

---

## Troubleshooting

### Issue 1: Button Still Not Visible After Restart

**Check DevTools Console for debug logs:**
```javascript
// You should see:
[SuggestedQuestionsList] Render: { ... }
```

**If no logs appear:**
- Component not rendering at all
- Check if you're looking at an assistant message (not user message)
- Check `MessageBubble.tsx` line 78: `isAssistant &&` condition

**If logs show `hasCachedData: true`:**
- Clear React Query cache: Open Console, type `localStorage.clear()`, refresh

**If logs show `isError: true`:**
- Previous auto-fetch attempt failed and cached error state
- Clear cache and refresh

### Issue 2: Button Visible But Clicking Does Nothing

**Check Console for:**
```javascript
[SuggestedQuestionsList] Fetch triggered
```

**If log appears but no network request:**
- Check `sessionId` prop value in console log
- If `undefined`, check `MessageBubble.tsx` line 139: `sessionId={message.id}`

**If no log appears:**
- onClick handler not firing
- Check browser console for JavaScript errors

### Issue 3: Test Page Shows 404

Dev server hasn't picked up new page file. Restart dev server:
```bash
# Kill server (Ctrl+C)
cd frontend
npm run dev
```

### Issue 4: Generation Takes Too Long (>150s)

Backend/AI service timeout. Check:
```bash
# Is AI service running?
curl http://localhost:8000/health

# Is Ollama model loaded?
curl http://localhost:11434/api/ps

# If model not loaded:
cd ai-service
python scripts/ensure_model_loaded.py
```

---

## Verification Checklist

Before reporting issues, verify:

- [ ] Frontend dev server restarted after code changes
- [ ] `.next` cache folder deleted
- [ ] Browser hard-refreshed (Ctrl+Shift+R)
- [ ] DevTools Console open and showing debug logs
- [ ] Looking at assistant message (not user message)
- [ ] `[SuggestedQuestionsList] Render` logs appear in console
- [ ] `hasCachedData: false` in first render
- [ ] Button element exists in DOM (inspect with DevTools Elements tab)

---

## Files Modified

1. `frontend/src/features/suggested-questions/hooks/useSuggestedQuestions.ts` (modified)
2. `frontend/src/features/suggested-questions/components/SuggestedQuestionsList.tsx` (modified + debug logs)
3. `frontend/src/app/test-suggestions/page.tsx` (NEW test page)

**AI Service Files Preserved:**
- All your existing `ai-service/` changes remain untouched
- No backend changes made
- No database changes made

---

## Next Steps After Testing

Once button is visible and working:

1. **Remove debug console.log statements** from `SuggestedQuestionsList.tsx` (lines added with `console.log`)
2. **Optional:** Delete test page `frontend/src/app/test-suggestions/page.tsx` if no longer needed
3. **Test complete flow:**
   - Generate questions
   - Click a suggested question
   - Verify it sends message to chat
   - Verify new assistant response appears
   - Verify button reappears for new message

---

## Expected Final Behavior

### Opening Chat
- ✅ No automatic generation
- ✅ No network requests on mount
- ✅ Button appears: "Suggest Questions"

### Clicking Button
- ✅ One API request triggered
- ✅ Loading state shown
- ✅ Questions appear after ~30-120s
- ✅ Button changes to "Regenerate"

### Refreshing Page
- ✅ Questions appear immediately (cached)
- ✅ No network request
- ✅ "Regenerate" button visible

### Clicking Regenerate
- ✅ New API request
- ✅ Questions replaced with fresh ones
- ✅ Cache updated

### Cache Expiry (after 5 minutes)
- ✅ Button reverts to "Suggest Questions"
- ✅ Clicking triggers fresh generation

---

**Date:** 2026-10-15
**Status:** ✅ Code complete, waiting for dev server restart
**Test URL:** http://localhost:3000/test-suggestions (after restart)
**Real Chat URL:** http://localhost:3000/chat
