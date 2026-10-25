<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Backend is an external REST API (VITE_API_BASE_URL); no Lovable Cloud. All calls go through src/lib/api/client.ts, wrapped by one service per feature in src/services — UI never calls fetch directly.
- VITE_USE_MOCK_API=true makes services return in-memory demo data from src/data/mock.ts (session-only, never claimed as saved). With mock off, API errors surface to the UI; never fall back to mock data.
- Never present medical diagnoses; symptom tags require explicit user confirmation.
- Env settings live only in src/lib/api/config.ts; the endpoint contract lives in docs/api-contract.md and must be updated with any service path/shape change.
- Character rendering and transient pet reactions belong in the shared CuteBuddy component; pages pass contextual state from existing interactions so the pet never alters service data or backend behavior.
