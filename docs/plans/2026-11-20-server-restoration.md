# Server Restoration and Service Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the FastAPI backend service (port 8000) and Next.js frontend development server (port 3000) following the environment restart, and verify end-to-end connectivity and telemetry serving.

**Architecture:**
- Start FastAPI uvicorn daemon on `http://127.0.0.1:8000` with hot-reload enabled.
- Start Next.js development server daemon on `http://localhost:3000`.
- Verify HTTP health checks and telemetry endpoint responses on both ports.
- Validate interactive accessibility via a browser subagent with a smaller model.

**Tech Stack:** Python 3.11, FastAPI, Uvicorn, Next.js 15, Node.js, PowerShell.

**Spec:** [docs/plans/2026-11-20-server-restoration.md](file:///c:/Users/adity/OneDrive/Desktop/Desktop/College/c9%20Hackathon/c9-oracle/docs/plans/2026-11-20-server-restoration.md)

## Global Constraints

- Do not use emojis anywhere in code, markdown, logs, or UI text.
- Maintain orchestrator role and use Gemini Flash models for subagent tasks.
- Browser environment testing must be conducted using a subagent with a smaller model (`flash_lite`).

---

## Subpart Breakdown & Bite-Sized Tasks

### Task 1: Start Backend and Frontend Services

**Files:**
- No file changes needed (process startup)

- [ ] **Step 1: Start FastAPI backend daemon on port 8000**
- [ ] **Step 2: Start Next.js frontend daemon on port 3000**
- [ ] **Step 3: Verify port listeners on 8000 and 3000**

---

### Task 2: Service Health and Telemetry Verification

- [ ] **Step 1: Test backend HTTP endpoints (`/api/v1/featured-series`, `/api/v1/vlr/match/vlr-c9-loud-kickoff2026/coaching-report`)**
- [ ] **Step 2: Test frontend HTTP endpoint (`http://localhost:3000/`)**
- [ ] **Step 3: Dispatch browser QA subagent to verify live site load and UI interaction**
