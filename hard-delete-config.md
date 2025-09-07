# Hard Delete Configuration

The application performs *hard deletes* of routines, exercises, and sets by default. On startup it sets `USE_HARD_DELETE` to `true` in browser `localStorage`. You can override this flag to fall back to soft deletes if needed.

## Override hard deletes

Set `USE_HARD_DELETE` to `false` in either of the following places to use soft deletes instead:

### Environment variable (Node, tests, CLI)
```bash
USE_HARD_DELETE=false npm start
# or
USE_HARD_DELETE=false npm test
```

### Browser localStorage (during development)
```javascript
localStorage.setItem('USE_HARD_DELETE', 'false');
```

If the flag is not set or is `true`, the app uses hard delete behavior.
