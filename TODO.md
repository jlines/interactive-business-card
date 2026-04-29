# TODO

## Follow-up: token audience context not reflected in chat

Current state:
- Entry token validation works.
- `/api/session` creates session successfully.
- Chat endpoint returns responses.
- Token was created with audience context, but chat behavior does not appear to use that context.

Pick up next session:
1. Trace token context flow from token store -> session creation -> prompt assembly.
2. Verify `tokenRecord.audienceHint`/`customOpener` persistence in session repository (Dynamo + in-memory paths).
3. Confirm prompt builder includes token context in provider request payload.
4. Add/adjust tests to lock expected behavior.
