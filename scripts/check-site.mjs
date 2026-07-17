import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDirectory = join(repositoryRoot, 'public');
const errors = [];

function report(file, message) {
  errors.push(`${relative(repositoryRoot, file)}: ${message}`);
}

const publicFiles = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'public'],
  { cwd: repositoryRoot, encoding: 'utf8' }
)
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((file) => join(repositoryRoot, file));
const htmlFiles = publicFiles.filter((file) => extname(file) === '.html');

for (const file of publicFiles) {
  const path = relative(publicDirectory, file);
  if (/(^|\/)(\.DS_Store|temp)(\/|$)|\.(mov|mp4)$/i.test(path)) {
    report(file, 'private, temporary, or large media must not be published');
  }
}

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');

  if (!/<html\b[^>]*\blang="[^"]+"/i.test(html)) {
    report(file, 'missing an html lang attribute');
  }

  if ((html.match(/<h1\b/gi) || []).length !== 1) {
    report(file, 'must contain exactly one h1');
  }

  if (!/<title>[^<]+<\/title>/i.test(html)) {
    report(file, 'missing a page title');
  }

  if (!/<meta\s+name="description"\s+content="[^"]+"/i.test(html)) {
    report(file, 'missing a meta description');
  }

  if (/github\.com\/bfogels1/i.test(html)) {
    report(file, 'links to the retired GitHub identity');
  }

  const ids = [...html.matchAll(/\bid="([^"]+)"/gi)].map((match) => match[1]);
  for (const id of new Set(ids)) {
    if (ids.filter((candidate) => candidate === id).length > 1) {
      report(file, `duplicate id "${id}"`);
    }
  }

  for (const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      report(file, `invalid JSON-LD: ${error.message}`);
    }
  }

  for (const match of html.matchAll(/<(?:a|link|img|script)\b[^>]*(?:href|src)="([^"]+)"[^>]*>/gi)) {
    const [element, rawReference] = match;
    const reference = rawReference.split('#')[0].split('?')[0];

    if (/^<a\b/i.test(element) && /target="_blank"/i.test(element)) {
      const relation = element.match(/\brel="([^"]+)"/i)?.[1] || '';
      if (!relation.includes('noopener') || !relation.includes('noreferrer')) {
        report(file, `external link is missing rel="noopener noreferrer": ${rawReference}`);
      }
    }

    if (!reference || /^(?:https?:|mailto:|tel:|data:)/i.test(reference)) {
      continue;
    }

    let target;
    if (reference.startsWith('/')) {
      target = join(publicDirectory, reference.slice(1));
    } else {
      target = resolve(dirname(file), reference);
    }

    if (reference.endsWith('/') || target === publicDirectory) {
      target = join(target, 'index.html');
    }

    if (!target.startsWith(`${publicDirectory}${sep}`) && target !== join(publicDirectory, 'index.html')) {
      report(file, `reference escapes the public directory: ${rawReference}`);
    } else if (!existsSync(target)) {
      report(file, `missing local reference: ${rawReference}`);
    }
  }
}

const css = readFileSync(join(publicDirectory, 'css', 'styles.css'), 'utf8');
for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/gi)) {
  const reference = match[1];
  if (/^(?:https?:|data:)/i.test(reference)) {
    continue;
  }

  const target = resolve(join(publicDirectory, 'css'), reference);
  if (!existsSync(target)) {
    report(join(publicDirectory, 'css', 'styles.css'), `missing local reference: ${reference}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${htmlFiles.length} HTML pages and ${publicFiles.length} public files.`);
}
