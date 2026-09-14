import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CARGO_MANIFEST = path.join(ROOT, 'src-tauri', 'Cargo.toml');
const PROJECT_LICENSE = path.join(ROOT, 'LICENSE');
const DEFAULT_TARGET = 'x86_64-pc-windows-msvc';
const DEFAULT_OUTPUT = 'THIRD_PARTY_NOTICES.txt';

const args = process.argv.slice(2);
function option(name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  if (index + 1 >= args.length) throw new Error(`${name} requires a value`);
  return args[index + 1];
}

const target = option('--target') ?? DEFAULT_TARGET;
const output = path.resolve(ROOT, option('--output') ?? DEFAULT_OUTPUT);
const evidenceOutput = option('--evidence');

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error(`${command} ${commandArgs.join(' ')} failed with exit code ${result.status}`);
  }
  return result.stdout;
}

const tempReport = path.join(os.tmpdir(), `nodeeditor-third-party-${process.pid}-${Date.now()}.json`);
try {
  run(process.execPath, [
    path.join(ROOT, 'scripts', 'audit-third-party-distribution.mjs'),
    '--target', target,
    '--output', tempReport,
  ]);

  const distribution = JSON.parse(fs.readFileSync(tempReport, 'utf8'));
  const metadata = JSON.parse(run('cargo', [
    'metadata', '--locked', '--format-version', '1', '--manifest-path', CARGO_MANIFEST,
  ]));

  const cargoPackages = new Map();
  for (const pkg of metadata.packages ?? []) {
    cargoPackages.set(`cargo:${pkg.name}@${pkg.version}`, pkg);
  }

  const runtime = distribution.packages
    .filter((pkg) => pkg.classification === 'runtime')
    .sort((a, b) => `${a.ecosystem}:${a.name}@${a.version ?? 'vendored'}`.localeCompare(`${b.ecosystem}:${b.name}@${b.version ?? 'vendored'}`));

  const projectMit = fs.readFileSync(PROJECT_LICENSE, 'utf8').replaceAll('\r\n', '\n').trimEnd();
  const mitPermissionIndex = projectMit.indexOf('Permission is hereby granted');
  if (mitPermissionIndex < 0) throw new Error('Project LICENSE is not the expected MIT template.');
  const mitBody = projectMit.slice(mitPermissionIndex);
  const makeMit = (copyright) => `MIT License\n\n${copyright}\n\n${mitBody}`;

  const iscBody = `Permission to use, copy, modify, and/or distribute this software for any\npurpose with or without fee is hereby granted, provided that the above\ncopyright notice and this permission notice appear in all copies.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\" AND THE AUTHOR DISCLAIMS ALL WARRANTIES\nWITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF\nMERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY\nSPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES\nWHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN\nACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF\nOR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`;

  const curated = new Map([
    ['cargo:alloc-stdlib@0.2.4', {
      selectedLicense: 'BSD-3-Clause',
      fallbackPackage: 'cargo:alloc-no-stdlib@2.0.4',
      source: 'https://github.com/dropbox/rust-alloc-no-stdlib',
    }],
    ['cargo:selectors@0.36.1', {
      selectedLicense: 'MPL-2.0',
      fallbackPackage: 'cargo:cssparser@0.36.0',
      source: 'https://crates.io/crates/selectors/0.36.1',
      sourceArchive: 'https://crates.io/api/v1/crates/selectors/0.36.1/download',
    }],
    ...['unic-char-property', 'unic-char-range', 'unic-common', 'unic-ucd-ident', 'unic-ucd-version'].map((name) => [
      `cargo:${name}@0.9.0`,
      {
        selectedLicense: 'MIT',
        source: 'https://github.com/open-i18n/rust-unic',
        generatedText: makeMit([
          'Copyright 2011-2015 The Rust Project developers.',
          'Copyright 2013-2016 The rust-url developers.',
          'Copyright 2015-2017 The Servo Project developers.',
          'Copyright 2017 The UNIC Project developers.',
        ].join('\n')),
      },
    ]),
    ['cargo:webview2-com@0.38.2', {
      selectedLicense: 'MIT',
      source: 'https://github.com/wravery/webview2-rs',
      generatedText: makeMit('Copyright (c) 2021 Bill Avery'),
    }],
    ['cargo:webview2-com-sys@0.38.2', {
      selectedLicense: 'MIT',
      source: 'https://github.com/wravery/webview2-rs',
      generatedText: makeMit('Copyright (c) 2021 Bill Avery'),
    }],
  ]);

  const vendored = new Map([
    ['vendored:Preact@vendored', {
      selectedLicense: 'MIT',
      source: 'https://github.com/preactjs/preact',
      generatedText: makeMit('Copyright (c) 2015-present Jason Miller'),
    }],
    ['vendored:Lucide icon geometry@1.29.0', {
      selectedLicense: 'ISC AND MIT',
      source: 'https://github.com/lucide-icons/lucide/tree/1.29.0',
      generatedText: [
        'ISC License',
        '',
        'Copyright (c) 2026 Lucide Icons and Contributors',
        '',
        iscBody,
        '',
        'Feather-derived icons used by this application are additionally covered by:',
        '',
        makeMit('Copyright (c) 2013-present Cole Bemis'),
      ].join('\n'),
    }],
  ]);

  function readPackageLegalFiles(identity, files) {
    const pkg = cargoPackages.get(identity);
    if (!pkg) throw new Error(`Cargo metadata is missing ${identity}`);
    const packageDir = path.dirname(pkg.manifest_path);
    return files.map((relative) => {
      const absolute = path.resolve(packageDir, relative);
      const relCheck = path.relative(packageDir, absolute);
      if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) {
        throw new Error(`Legal file escapes package root for ${identity}: ${relative}`);
      }
      if (!fs.existsSync(absolute)) throw new Error(`Legal file disappeared for ${identity}: ${relative}`);
      return {
        name: relative.replaceAll('\\', '/'),
        text: fs.readFileSync(absolute, 'utf8').replaceAll('\r\n', '\n').trimEnd(),
      };
    });
  }

  function legalMaterial(identity, pkg) {
    if (pkg.ecosystem === 'vendored') {
      const rule = vendored.get(identity);
      if (!rule) throw new Error(`Vendored runtime component lacks a curated notice rule: ${identity}`);
      return {
        effectiveLicense: rule.selectedLicense,
        source: rule.source,
        sourceArchive: null,
        files: [{ name: 'curated upstream license', text: rule.generatedText }],
      };
    }

    if (pkg.complianceFiles?.length) {
      return {
        effectiveLicense: pkg.license ?? `FILE:${pkg.licenseFile}`,
        source: pkg.sourceCodeUrl ?? pkg.repository ?? null,
        sourceArchive: pkg.sourceArchiveUrl ?? null,
        files: readPackageLegalFiles(identity, pkg.complianceFiles),
      };
    }

    const rule = curated.get(identity);
    if (!rule) throw new Error(`Runtime package lacks legal material and no curated exception exists: ${identity}`);
    let files;
    if (rule.generatedText) {
      files = [{ name: 'curated upstream license', text: rule.generatedText }];
    } else if (rule.fallbackPackage) {
      const fallback = distribution.packages.find((candidate) => `${candidate.ecosystem}:${candidate.name}@${candidate.version ?? 'vendored'}` === rule.fallbackPackage);
      if (!fallback?.complianceFiles?.length) {
        throw new Error(`Curated fallback has no detected legal material: ${identity} -> ${rule.fallbackPackage}`);
      }
      files = readPackageLegalFiles(rule.fallbackPackage, fallback.complianceFiles);
    } else {
      throw new Error(`Curated rule has no legal material strategy: ${identity}`);
    }
    return {
      effectiveLicense: rule.selectedLicense,
      source: rule.source ?? pkg.sourceCodeUrl ?? pkg.repository ?? null,
      sourceArchive: rule.sourceArchive ?? pkg.sourceArchiveUrl ?? null,
      files,
    };
  }

  const packageRows = [];
  const textGroups = new Map();
  const evidence = [];

  for (const pkg of runtime) {
    const identity = `${pkg.ecosystem}:${pkg.name}@${pkg.version ?? 'vendored'}`;
    const material = legalMaterial(identity, pkg);
    if (!material.source) throw new Error(`Runtime package lacks a source reference: ${identity}`);
    if (!material.files.length) throw new Error(`Runtime package lacks license material: ${identity}`);

    const hashes = [];
    for (const file of material.files) {
      const normalized = file.text.trimEnd();
      if (!normalized) throw new Error(`Empty legal text for ${identity}: ${file.name}`);
      const hash = crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
      hashes.push(hash);
      if (!textGroups.has(hash)) textGroups.set(hash, { text: normalized, packages: new Set(), names: new Set() });
      const group = textGroups.get(hash);
      group.packages.add(identity);
      group.names.add(file.name);
    }

    packageRows.push({
      identity,
      declaredLicense: pkg.license ?? `FILE:${pkg.licenseFile}`,
      effectiveLicense: material.effectiveLicense,
      source: material.source,
      sourceArchive: material.sourceArchive,
      legalTextSha256: hashes,
    });
    evidence.push({ identity, legalTextSha256: hashes });
  }

  const lines = [
    'Hytale Generator Workbench - Third-Party Licenses',
    `Windows target: ${target}`,
    '',
    'This file is generated from the checked dependency locks and the actual',
    'Windows runtime dependency graph. Build-only and other-target dependencies',
    'are intentionally excluded from this binary-distribution notice.',
    '',
    'Runtime components',
    '==================',
    '',
  ];

  for (const row of packageRows) {
    lines.push(row.identity);
    lines.push(`  Declared license: ${row.declaredLicense}`);
    if (row.effectiveLicense !== row.declaredLicense) lines.push(`  Distribution license: ${row.effectiveLicense}`);
    lines.push(`  Source: ${row.source}`);
    if (row.sourceArchive) lines.push(`  Exact source archive: ${row.sourceArchive}`);
    lines.push(`  Legal text SHA-256: ${row.legalTextSha256.join(', ')}`);
    lines.push('');
  }

  lines.push('License and attribution texts');
  lines.push('=============================');
  lines.push('');

  for (const [hash, group] of [...textGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`SHA-256: ${hash}`);
    lines.push(`Applies to: ${[...group.packages].sort().join(', ')}`);
    lines.push(`Source file(s): ${[...group.names].sort().join(', ')}`);
    lines.push('----------------------------------------');
    lines.push(group.text);
    lines.push('');
  }

  const result = `${lines.join('\n').trimEnd()}\n`;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, result, 'utf8');

  if (evidenceOutput) {
    const evidencePath = path.resolve(ROOT, evidenceOutput);
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, `${JSON.stringify({
      schemaVersion: 1,
      target,
      runtimePackages: packageRows.length,
      distinctLegalTexts: textGroups.size,
      packages: packageRows,
      noticeSha256: crypto.createHash('sha256').update(result, 'utf8').digest('hex'),
    }, null, 2)}\n`, 'utf8');
  }

  console.log(`Third-party notices: PASS (${packageRows.length} runtime components, ${textGroups.size} distinct legal texts)`);
  console.log(`Wrote ${path.relative(ROOT, output)}`);
} finally {
  try { fs.unlinkSync(tempReport); } catch {}
}
