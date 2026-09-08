// Bootstrap for `npm test`. Node's test runner spawns each test FILE as its
// own child process, and Prisma sizes its default connection pool as
// num_cpus*2+1 PER process (e.g. 49 on a 24-core machine) — with ~8
// DB-touching test files under default (CPU-count) concurrency, that
// overruns Postgres's default max_connections (100) and causes
// intermittent "Can't reach database server" failures, a different test
// failing each run. Confirmed: --test-concurrency=1 always passes;
// default concurrency fails ~2 of 3 runs.
//
// Fix: cap each process's pool via DATABASE_URL's connection_limit, set
// once here. Prisma reads this directly off the connection string, so it
// covers every `new PrismaClient()` in the repo (test files and the app's
// own src/lib/prisma.ts singleton) with no changes to any of them.
//
// Finds test files itself (not a glob string) so there's no dependency on
// which shell expands `**` — cmd.exe (Windows' default) doesn't expand it
// the way bash does, which would silently break test discovery there.
import { spawnSync } from "node:child_process";
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const testsDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = dirname(testsDir.replace(/[/\\]$/, ""));

// `tsx`'s own CLI auto-loads .env, which is how DATABASE_URL previously
// reached test-file processes even though nothing in this repo loaded it
// explicitly. Invoking node directly with `--import tsx` (below) doesn't
// trigger that CLI-only behavior, so it's replaced here with a minimal,
// single-variable extraction — deliberately not a general .env loader:
// pulling in every var (e.g. via --env-file) would leak keys like
// ANTHROPIC_API_KEY/OPENAI_API_KEY into the test env that were never
// present before and that some tests specifically assert are absent
// (tests/toefl/speaking-evaluator.test.ts).
function readDatabaseUrlFromDotenv() {
  const envPath = join(repoRoot, ".env");
  if (!existsSync(envPath)) return undefined;
  const match = readFileSync(envPath, "utf-8").match(/^DATABASE_URL\s*=\s*"?([^"\n\r]*)"?\s*$/m);
  return match?.[1];
}

function findTestFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...findTestFiles(full));
    } else if (entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

const testFiles = findTestFiles(testsDir);

const dbUrl = process.env.DATABASE_URL ?? readDatabaseUrlFromDotenv();
const boundedUrl =
  dbUrl && !/[?&]connection_limit=/.test(dbUrl)
    ? dbUrl + (dbUrl.includes("?") ? "&" : "?") + "connection_limit=3"
    : dbUrl;

// A per-process connection_limit alone still leaves the worst case
// governed by os.availableParallelism() (24 on this machine) — empirically,
// connection_limit=3 with the default (24-way) concurrency still failed
// ~1 run in 6. Also capping concurrency closes that gap: verified 10/10
// clean runs at 4, vs. still-occasional failures at 8. Still well above 1
// (fully serial), so the ~30 pure-function test files aren't needlessly
// serialized — only the handful of concurrent DB-touching files sharing a
// small pool each were ever the problem.
const TEST_CONCURRENCY = 4;

// Invokes node itself (process.execPath — always a real, already-valid
// absolute path) with tsx registered as a --import loader, rather than
// spawning the `npx`/`tsx` shell shims. Avoids two Windows-specific
// pitfalls: shell:true naively joins an argv array into one command
// string without quoting, which breaks on any path containing a space
// (this repo's own directory does); and .cmd shims can't be spawned at
// all with shell:false. Neither applies here since there's no shim and no
// shell-level string joining involved.
const result = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "--test",
    `--test-concurrency=${TEST_CONCURRENCY}`,
    ...testFiles,
  ],
  {
    stdio: "inherit",
    shell: false,
    env: { ...process.env, DATABASE_URL: boundedUrl },
  }
);

process.exit(result.status ?? 1);
