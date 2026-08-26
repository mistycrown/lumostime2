# Scene 05 AI Companion Design

## Goal

Present LumosTime's AI as both a structured operator and a continuing companion: it can turn natural language into records and plans, then proactively return to the user's day.

## Copy

- Keep the title: `说出来，就能记下来。`
- Middle copy: `不只记下刚刚发生的事，也可以把接下来要做的计划交给它。它会回应，也会记得回来问你。`
- Closing copy: `也许在某个深夜，它会写一封信给你。`

## Conversation

- Use the existing built-in persona `半两（小猫）`, with the display name `小猫助手` and the `🐱` avatar.
- Show one user request containing two completed intervals and a future reading plan.
- Let the assistant reply naturally, showing two compact record cards on one line; the afternoon action is represented as a timed reminder rather than a plan card.
- Add the time marker `16:30 · 小猫来问问`.
- Show a second, proactive assistant message asking whether the reading was completed, followed by a short user reply to make the interaction visibly two-way.
- Add a third, later user/assistant exchange to show that the thread can receive another real update without becoming a one-shot command demo.
- Use wider, flatter bubbles and compact cards so both conversation rounds remain visible.

## Verification

- Parse the inline playback script.
- Confirm all approved copy, persona labels, and the `16:30 · 小猫来问问` marker are present.
- Check that the conversation remains inside the app frame and the two rounds have distinct animation timings.
