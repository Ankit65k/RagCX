\## Development Guidelines



Before making any change, always:

1\. Read the actual file(s) involved — never assume a function, import, variable, or API exists. If unsure, search/grep for it or check the docs/package before using it.

2\. If uncertain about a fact (a library's API, a config option, version-specific behavior), say so and verify it rather than guessing.

3\. After any change, verify it — read the modified file back, run relevant tests, or run the app/build before saying the task is done.



For code style:

\- Match existing naming, folder structure, and patterns already used in this repo instead of introducing a generic style.

\- Prefer clear, readable code over clever one-liners. Use meaningful variable/function names.

\- Avoid unnecessary abstraction, premature optimization, or over-engineering.

\- Add comments only where the "why" isn't obvious from the code itself.

\- Keep functions focused and reasonably short.

\- Optimize for readability first, performance second, unless explicitly told otherwise.



Never claim something is "done," "tested," or "working" unless you've actually run it or the tests in this session and seen the result.



\## Session Handoff Protocol



At the end of every session, before we stop:

1\. Update PROJECT\_STATUS.md with:

&#x20;  - What was completed this session

&#x20;  - What's currently blocked (and why)

&#x20;  - What the immediate next step is

&#x20;  - Any environment/infra state that matters (e.g., "Redis/Ollama/Postgres now installed and running locally as of \[date]")



At the start of every new session, before doing anything else:

1\. Read PROJECT\_STATUS.md first to know exactly where we left off.

2\. Don't ask me to re-explain what's already documented there — just confirm your understanding in one or two lines and proceed.

