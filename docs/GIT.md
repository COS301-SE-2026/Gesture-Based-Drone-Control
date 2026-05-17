# Universal Git Branch Strategy

> A consistent workflow to keep all teams in sync, minimize merge conflicts, and maintain a stable codebase.

```mermaid
flowchart LR
    main(["main"]):::main
    dev(["dev"]):::dev
    uc(["UC#"]):::uc
    feat(["feature/UC#/name"]):::feat

    main --> dev --> uc --> feat
    feat -->|PR| uc
    uc -->|PR| dev
    dev -->|PR| main

    classDef main fill:#ff6b6b,color:#fff,stroke:none
    classDef dev  fill:#7c6dfa,color:#fff,stroke:none
    classDef uc   fill:#4fffb0,color:#111,stroke:none
    classDef feat fill:#4a90d9,color:#fff,stroke:none
```

---

## 01 · Branch Overview

| Branch | Purpose |
|---|---|
| `main` | Production-ready code only. Always stable. |
| `dev` | Integration branch. All Use Case branches merge here when ready. |
| `UC1`, `UC2` … `UCn` | One branch per Use Case. All feature work originates here. |
| `feature/UC#/name` | Individual features or bugfixes, created from the Use Case branch. |

> **Keep your Use Case branch current.** Regularly merge `dev` into your UC branch to stay aligned with the rest of the project and prevent large conflicts later.

---

## 02 · Sync Your Use Case Branch with Dev

**Step 1 — Switch to your Use Case branch**
In the Source Control panel, switch to your UC branch (e.g. `UC1`, `UC2`).

**Step 2 — Pull latest remote changes**
Click **Sync Changes** or **Pull** in the Source Control panel to fetch the latest updates.

**Step 3 — Merge `dev` into your branch**
Open the Command Palette:
- Mac: `Cmd+Shift+P`
- Windows / Linux: `Ctrl+Shift+P`

Type and select **Git: Merge Branch…** then choose `dev`. Resolve any conflicts, stage, and commit.

---

## 03 · Feature Development Workflow

**Step 1 — Create your feature branch from your Use Case branch**

```bash
# Switch to your UC branch and pull latest
git checkout [UC#]
git pull origin [UC#]

# Create your feature branch
git checkout -b feature/UC#/some-feature-name
```

**Step 2 — Work on your feature**
Develop, commit often, and keep your changes focused on a single feature or fix.

**Step 3 — Before opening a PR — merge your UC branch in**
Pull the latest from your Use Case branch, then merge locally to resolve conflicts before review.

```bash
# Update your UC branch
git checkout [UC#]
git pull origin [UC#]

# Merge into your feature branch
git checkout feature/your-feature-name
git merge [UC#]
# Resolve conflicts, then commit if needed
```

**Step 4 — Open a Pull Request**
Push your branch and create a PR to merge into your Use Case branch. With conflicts already resolved, reviews and merges stay clean.

---

## 04 · VS Code Source Control

**Step 1 — Sync your Use Case branch**
In the Source Control panel, switch to your UC branch. Click **Sync Changes** or **Pull** to fetch and pull the latest from remote.

**Step 2 — Switch to your feature branch**
Select your feature branch from the branch menu (bottom-left). If it doesn't exist yet, click **Create new branch from…**, select your UC branch, and name it.

**Step 3 — Merge team branch into feature branch**
With your feature branch checked out, open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`), type **Git: Merge Branch…**, and select your UC branch. VS Code will highlight conflicts — resolve them in the editor, then stage and commit.

**Step 4 — Create a Pull Request**
Push your branch with the **Sync Changes** or **Push** button. Then use the **Create Pull Request** button in the Source Control panel, or open a PR directly on GitHub / GitLab.

---

## 05 · Best Practices

| | Practice |
|---|---|
| `sync` | Regularly merge the latest `dev` into your Use Case branch |
| `update` | Keep your feature branch up to date with your UC branch before opening a PR |
| `local` | Resolve conflicts locally before submitting your PR |
| `review` | Only merge into your UC branch via PR, after review |