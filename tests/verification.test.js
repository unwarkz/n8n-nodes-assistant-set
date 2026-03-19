/**
 * n8n Community Node Verification Tests
 *
 * Automated checks that reproduce the n8n verification guidelines:
 * https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/
 *
 * These tests validate every publishable package in the monorepo.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

/* ------------------------------------------------------------------ */
/*  Package definitions                                                */
/* ------------------------------------------------------------------ */

// All standalone packages (mem0-package, gotenberg-package, etc.) use package/dist
// as their dist source of truth. Files are synced at publish time by GitHub Actions.
const PACKAGES = [
  {
    name: '@unwarkz/n8n-nodes-assistant-set',
    dir: path.join(ROOT, 'package'),
    distDir: path.join(ROOT, 'package', 'dist'),
  },
  {
    name: '@unwarkz/n8n-nodes-mem0',
    dir: path.join(ROOT, 'mem0-package'),
    distDir: path.join(ROOT, 'package', 'dist'), // source of truth
  },
  {
    name: '@unwarkz/n8n-nodes-gotenberg-pdf',
    dir: path.join(ROOT, 'gotenberg-package'),
    distDir: path.join(ROOT, 'package', 'dist'),
  },
  {
    name: '@unwarkz/n8n-nodes-telegram-bot',
    dir: path.join(ROOT, 'telegram-bot-package'),
    distDir: path.join(ROOT, 'package', 'dist'),
  },
  {
    name: '@unwarkz/n8n-nodes-outline-wiki',
    dir: path.join(ROOT, 'outline-package'),
    distDir: path.join(ROOT, 'package', 'dist'),
  },
  {
    name: '@unwarkz/n8n-nodes-qdrant',
    dir: path.join(ROOT, 'qdrant-package'),
    distDir: path.join(ROOT, 'package', 'dist'),
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function allJsFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...allJsFiles(full));
    } else if (entry.name.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

/* ================================================================== */
/*  1. Package source verification                                     */
/* ================================================================== */

describe('Package source verification', () => {
  test.each(PACKAGES.map((p) => [p.name, p]))(
    '%s — package.json has valid metadata',
    (_name, pkg) => {
      const pj = readJson(path.join(pkg.dir, 'package.json'));

      // name must follow n8n pattern
      expect(pj.name).toMatch(/^(@[^/]+\/)?n8n-nodes-/);

      // Must have repository URL pointing to this GitHub repo
      expect(pj.repository).toBeDefined();
      expect(pj.repository.url).toContain(
        'github.com/unwarkz/n8n-nodes-assistant-set',
      );

      // License must be MIT
      expect(pj.license).toBe('MIT');

      // Must have homepage
      expect(pj.homepage).toBeDefined();
      expect(pj.homepage).toContain('github.com');

      // Must have bugs URL
      expect(pj.bugs).toBeDefined();
      expect(pj.bugs.url).toContain('github.com');

      // Must have author
      expect(pj.author).toBeDefined();
    },
  );

  test.each(PACKAGES.map((p) => [p.name, p]))(
    '%s — README.md exists',
    (_name, pkg) => {
      const readmePath = path.join(pkg.dir, 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);
      const content = fs.readFileSync(readmePath, 'utf8');
      expect(content.length).toBeGreaterThan(50);
    },
  );
});

/* ================================================================== */
/*  2. n8n package structure                                           */
/* ================================================================== */

describe('n8n package structure', () => {
  test.each(PACKAGES.map((p) => [p.name, p]))(
    '%s — has n8n-community-node-package keyword',
    (_name, pkg) => {
      const pj = readJson(path.join(pkg.dir, 'package.json'));
      expect(pj.keywords).toBeDefined();
      expect(pj.keywords).toContain('n8n-community-node-package');
    },
  );

  test.each(PACKAGES.map((p) => [p.name, p]))(
    '%s — has n8n section with nodes and credentials',
    (_name, pkg) => {
      const pj = readJson(path.join(pkg.dir, 'package.json'));
      expect(pj.n8n).toBeDefined();
      expect(pj.n8n.n8nNodesApiVersion).toBe(1);
      expect(Array.isArray(pj.n8n.nodes)).toBe(true);
      expect(pj.n8n.nodes.length).toBeGreaterThan(0);
      expect(Array.isArray(pj.n8n.credentials)).toBe(true);
      expect(pj.n8n.credentials.length).toBeGreaterThan(0);
    },
  );

  test.each(PACKAGES.map((p) => [p.name, p]))(
    '%s — all declared node files exist in dist source',
    (_name, pkg) => {
      const pj = readJson(path.join(pkg.dir, 'package.json'));
      for (const nodeFile of pj.n8n.nodes) {
        // Resolve relative to the dist source of truth (package/dist)
        const fullPath = path.join(pkg.distDir, nodeFile.replace(/^dist\//, ''));
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    },
  );

  test.each(PACKAGES.map((p) => [p.name, p]))(
    '%s — all declared credential files exist in dist source',
    (_name, pkg) => {
      const pj = readJson(path.join(pkg.dir, 'package.json'));
      for (const credFile of pj.n8n.credentials) {
        const fullPath = path.join(
          pkg.distDir,
          credFile.replace(/^dist\//, ''),
        );
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    },
  );
});

/* ================================================================== */
/*  3. No external (runtime) dependencies                              */
/* ================================================================== */

describe('No external runtime dependencies', () => {
  test.each(PACKAGES.map((p) => [p.name, p]))(
    '%s — package.json must not have "dependencies" field',
    (_name, pkg) => {
      const pj = readJson(path.join(pkg.dir, 'package.json'));
      expect(pj.dependencies).toBeUndefined();
    },
  );
});

/* ================================================================== */
/*  4. No access to environment variables or file system               */
/* ================================================================== */

describe('No environment variable or file system access', () => {
  const distDir = path.join(ROOT, 'package', 'dist');
  const jsFiles = allJsFiles(distDir);

  test('dist directory contains JS files', () => {
    expect(jsFiles.length).toBeGreaterThan(0);
  });

  test.each(jsFiles.map((f) => [path.relative(ROOT, f), f]))(
    '%s — no process.env usage',
    (_rel, filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toMatch(/process\.env\b/);
    },
  );

  test.each(jsFiles.map((f) => [path.relative(ROOT, f), f]))(
    '%s — no fs module import',
    (_rel, filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      // Must not require('fs') or require('node:fs') etc
      expect(content).not.toMatch(/require\s*\(\s*['"](?:node:)?fs['"]\s*\)/);
      expect(content).not.toMatch(/from\s+['"](?:node:)?fs['"]/);
    },
  );

  test.each(jsFiles.map((f) => [path.relative(ROOT, f), f]))(
    '%s — no child_process module import',
    (_rel, filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toMatch(
        /require\s*\(\s*['"](?:node:)?child_process['"]\s*\)/,
      );
      expect(content).not.toMatch(/from\s+['"](?:node:)?child_process['"]/);
    },
  );
});

/* ================================================================== */
/*  5. Node file syntax validation                                     */
/* ================================================================== */

describe('Node file syntax validation', () => {
  const distDir = path.join(ROOT, 'package', 'dist');
  const jsFiles = allJsFiles(distDir);

  test.each(jsFiles.map((f) => [path.relative(ROOT, f), f]))(
    '%s — passes node --check syntax validation',
    (_rel, filePath) => {
      expect(() => {
        execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
      }).not.toThrow();
    },
  );
});

/* ================================================================== */
/*  6. English language only                                           */
/* ================================================================== */

describe('English language only', () => {
  test.each(PACKAGES.map((p) => [p.name, p]))(
    '%s — README is in English',
    (_name, pkg) => {
      const readmePath = path.join(pkg.dir, 'README.md');
      const content = fs.readFileSync(readmePath, 'utf8');
      // Check for common English words/phrases that should appear
      const lowerContent = content.toLowerCase();
      expect(
        lowerContent.includes('install') ||
          lowerContent.includes('usage') ||
          lowerContent.includes('node') ||
          lowerContent.includes('description'),
      ).toBe(true);
    },
  );
});

/* ================================================================== */
/*  7. Node descriptions are valid                                     */
/* ================================================================== */

describe('Node descriptions are well-formed', () => {
  const distDir = path.join(ROOT, 'package', 'dist');

  // Collect all node files
  const pj = readJson(path.join(ROOT, 'package', 'package.json'));
  const nodeFiles = pj.n8n.nodes.map((n) =>
    path.join(distDir, n.replace(/^dist\//, '')),
  );

  test.each(nodeFiles.map((f) => [path.relative(ROOT, f), f]))(
    '%s — exports a class with description property',
    (_rel, filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      // Node must export something
      expect(content).toMatch(/exports\./);
      // Node must have a description block
      expect(content).toMatch(/description:/);
    },
  );

  test.each(nodeFiles.map((f) => [path.relative(ROOT, f), f]))(
    '%s — has displayName and description in node definition',
    (_rel, filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toMatch(/displayName:/);
      expect(content).toMatch(/description:/);
    },
  );

  test.each(nodeFiles.map((f) => [path.relative(ROOT, f), f]))(
    '%s — has icon defined',
    (_rel, filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toMatch(/icon:/);
    },
  );
});

/* ================================================================== */
/*  8. Credential files are valid                                      */
/* ================================================================== */

describe('Credential files are well-formed', () => {
  const distDir = path.join(ROOT, 'package', 'dist');

  const pj = readJson(path.join(ROOT, 'package', 'package.json'));
  const credFiles = pj.n8n.credentials.map((c) =>
    path.join(distDir, c.replace(/^dist\//, '')),
  );

  test.each(credFiles.map((f) => [path.relative(ROOT, f), f]))(
    '%s — exports a credential class',
    (_rel, filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toMatch(/exports\./);
      // Handle both object literal (displayName:) and class assignment (this.displayName =)
      expect(content).toMatch(/displayName[:\s=]/);
      expect(content).toMatch(/\bname[:\s=]/);
      expect(content).toMatch(/properties[:\s=]/);
    },
  );
});

/* ================================================================== */
/*  9. Binary files hack preservation (global._n8nBinaryRegistry)      */
/* ================================================================== */

describe('Binary files hack is preserved', () => {
  const aiToolFiles = [
    'package/dist/nodes/gotenberg/GotenbergAiTools.node.js',
    'package/dist/nodes/telegram/TelegramBotAiTools.node.js',
    'package/dist/nodes/outline/OutlineAiTools.node.js',
    'package/dist/nodes/qdrant/QdrantAiTools.node.js',
    'package/dist/nodes/qdrant/QdrantStoreAiTools.node.js',
  ].map((f) => path.join(ROOT, f));

  test.each(aiToolFiles.map((f) => [path.relative(ROOT, f), f]))(
    '%s — uses global._n8nBinaryRegistry',
    (_rel, filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('global._n8nBinaryRegistry');
    },
  );

  test.each(aiToolFiles.map((f) => [path.relative(ROOT, f), f]))(
    '%s — initializes registry as Map',
    (_rel, filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      // Registry must be initialized as a Map
      expect(content).toMatch(/new Map\(\)/);
    },
  );

  // Files that WRITE to the registry must have size limit management
  const writingAiToolFiles = [
    'package/dist/nodes/gotenberg/GotenbergAiTools.node.js',
    'package/dist/nodes/telegram/TelegramBotAiTools.node.js',
    'package/dist/nodes/outline/OutlineAiTools.node.js',
  ].map((f) => path.join(ROOT, f));

  test.each(writingAiToolFiles.map((f) => [path.relative(ROOT, f), f]))(
    '%s — has size limit on binary registry (writers only)',
    (_rel, filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      // Registry must have size limit (100 entries)
      expect(content).toMatch(/\.size\s*>=?\s*100/);
    },
  );
});

/* ================================================================== */
/* 10. GitHub Actions workflows include provenance                     */
/* ================================================================== */

describe('GitHub Actions workflows', () => {
  const workflowDir = path.join(ROOT, '.github', 'workflows');
  const workflowFiles = fs
    .readdirSync(workflowDir)
    .filter((f) => f.startsWith('publish') && f.endsWith('.yml'))
    .map((f) => path.join(workflowDir, f));

  test('all publish workflows exist', () => {
    expect(workflowFiles.length).toBe(6);
  });

  test.each(workflowFiles.map((f) => [path.basename(f), f]))(
    '%s — includes id-token: write permission for provenance',
    (_name, filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('id-token: write');
    },
  );

  test.each(workflowFiles.map((f) => [path.basename(f), f]))(
    '%s — publishes with --provenance flag',
    (_name, filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('--provenance');
    },
  );

  test.each(workflowFiles.map((f) => [path.basename(f), f]))(
    '%s — uses Node.js 20 or higher',
    (_name, filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const nodeVersionMatch = content.match(/node-version:\s*['"]?(\d+)/);
      expect(nodeVersionMatch).not.toBeNull();
      expect(parseInt(nodeVersionMatch[1], 10)).toBeGreaterThanOrEqual(20);
    },
  );

  test.each(workflowFiles.map((f) => [path.basename(f), f]))(
    '%s — validates node syntax before publishing',
    (_name, filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('node --check');
    },
  );
});
