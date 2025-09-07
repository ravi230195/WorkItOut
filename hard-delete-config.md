# Hard Delete Configuration

The application can perform *hard deletes* of routines, exercises, and sets when the `USE_HARD_DELETE` flag is enabled. By default, deletions are **soft** and rows are only marked inactive.

## Enable hard deletes

Set `USE_HARD_DELETE` to `true` in either of the following places:

### Environment variable (Node, tests, CLI)
```bash
USE_HARD_DELETE=true npm start
# or
USE_HARD_DELETE=true npm test
```

### Browser localStorage (during development)
```javascript
localStorage.setItem('USE_HARD_DELETE', 'true');
```

If the flag is not set, the app continues to use soft delete behavior.
