#!/usr/bin/env node
import { run } from "./bin/design-lagann.mjs";

await run(["install", ...process.argv.slice(2)]);
