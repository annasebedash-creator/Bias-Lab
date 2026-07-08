# Bias & Fallacy Lab

🎮 **[Try it live](https://annasebedash-creator.github.io/Bias-Lab/)**

A gamified web platform that teaches **logical fallacies and cognitive biases** through interactive scenarios. Instead of memorizing definitions, you read realistic everyday arguments and learn to spot what's wrong with them.

## What's inside

- **26 fallacies & biases** defined in a structured content library ([`data/fallacies.json`](data/fallacies.json))
- **152 practice scenarios** — realistic snippets of arguments, ads and conversations to diagnose ([`data/scenarios.json`](data/scenarios.json))
- **Interactive practice modes** with immediate feedback and progress tracking (persisted locally between sessions)
- Audio feedback via the Web Audio API

## How it's built

Deliberately framework-free: plain **HTML + CSS + vanilla JavaScript**, with all learning content separated into JSON data files.

```
index.html        — single-page app shell
css/styles.css    — styling
js/app.js         — game logic, modes, feedback
js/store.js       — local progress persistence
data/*.json       — the content library (fallacies + scenarios)
```

The content-as-data design means new fallacies or scenarios can be added by editing JSON only — no code changes needed.

## Run locally

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Author

**Anna Sebedach** — [portfolio](https://anna-sebedach-portfolio.lovable.app/) · [GitHub](https://github.com/annasebedash-creator)
