import {Page, WebSocketRoute} from "@playwright/test"
import {execSync} from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const HERE = path.dirname(fileURLToPath(import.meta.url))

export const REPO_ROOT = path.resolve(HERE, "../../../..")
export const EVIDENCE_DIR = path.join(REPO_ROOT, "docs", "nfr", "evidence")
export SCREENSHOT_DIR = path.join(EVIDENCE_DIR, "screenshots")
const RAW_DIR = path.join(EVIDENCE_DIR, "raw")

const FIXTURE = JSON.parse(
    fs.readFileSync(path.join(HERE, "fixtures", "g"))
)