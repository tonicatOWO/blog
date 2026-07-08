#!/usr/bin/env bun
/**
 * Obsidian → Astro Blog Publisher
 *
 * Reads markdown from Obsidian vault, converts wiki syntax, copies images,
 * writes to src/content/blog/, and commits to git.
 *
 * Usage:
 *   bun run publish <vault/blog>                     # all posts
 *   bun run publish <vault/blog> file.md ...         # specific file(s)
 *   bun run publish <vault/blog> --dry-run           # preview, no writes
 *   bun run publish <vault/blog> --include-drafts    # include draft:true
 *
 * Env: OBSIDIAN_BLOG_DIR as fallback for vault path
 */

import { constants } from 'node:fs';
import { access, copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { simpleGit } from 'simple-git';

// ─── Paths ───────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const BLOG_DIR = join(PROJECT_ROOT, 'src', 'content', 'blog');
const ASSETS_DIR = join(PROJECT_ROOT, 'src', 'assets');
const VAULT_ASSETS = 'assets';

// ─── Types ───────────────────────────────────────────────────────────────────
interface CliOpts {
	vaultPath: string;
	files: string[];
	dryRun: boolean;
	includeDrafts: boolean;
}

interface ParsedPost {
	slug: string;
	data: Record<string, unknown>;
	body: string;
	bodyImages: string[];
	heroImageFilename: string | undefined;
}

interface ProcessedPost {
	slug: string;
	outputFm: Record<string, unknown>;
	body: string;
	copiedImages: string[];
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
function parseCli(): CliOpts {
	const args = process.argv.slice(2);
	const nonFlags = args.filter((a) => !a.startsWith('--'));
	const vaultPath = nonFlags[0] ?? process.env.OBSIDIAN_BLOG_DIR;
	const files = nonFlags.slice(1);
	const dryRun = args.includes('--dry-run');
	const includeDrafts = args.includes('--include-drafts');

	if (!vaultPath) {
		console.error('Vault path required.');
		console.error('  Usage: bun run publish <vault/blog> [file.md ...] [--dry-run] [--include-drafts]');
		console.error('  Or set OBSIDIAN_BLOG_DIR env var.');
		process.exit(1);
	}

	return { vaultPath, files, dryRun, includeDrafts };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function deriveSlug(file: string): string {
	return basename(file, extname(file))
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

function todayStr(): string {
	const d = new Date();
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

function extractFilename(p: string): string {
	return basename(p.replace(/\\/g, '/'));
}

// ─── Obsidian Syntax Conversion ──────────────────────────────────────────────
function convertObsidian(body: string): { body: string; images: string[] } {
	const images: string[] = [];

	// ![[image.png]] or ![[folder/image.png]] → ![](../../assets/image.png)
	let result = body.replace(/!\[\[(.+?)\]\]/g, (_m: string, path: string) => {
		const fn = extractFilename(path);
		images.push(fn);
		return `![](../../assets/${fn})`;
	});

	// [[Link|alias]] → alias (brackets inside link not allowed)
	result = result.replace(
		/\[\[([^\]|\x5b]+?)\|(.+?)\]\]/g,
		(_m: string, _link: string, alias: string) => alias,
	);

	// [[Link]] → Link (plain text)
	result = result.replace(
		/\[\[([^\]\x5b]+?)\]\]/g,
		(_m: string, link: string) => link,
	);

	return { body: result, images };
}

// ─── Image Management ────────────────────────────────────────────────────────
async function copyImage(
	src: string,
	dest: string,
	dryRun: boolean,
): Promise<boolean> {
	if (dryRun) {
		console.log(`  [DRY-RUN] Would copy: ${src} → ${dest}`);
		return true;
	}
	try {
		await access(src, constants.R_OK);
		await copyFile(src, dest);
		return true;
	} catch {
		return false;
	}
}

async function copyImages(
	vaultAssetsDir: string,
	filenames: string[],
	dryRun: boolean,
): Promise<string[]> {
	const copied: string[] = [];
	const unique = new Set(filenames);
	for (const fn of unique) {
		const src = join(vaultAssetsDir, fn);
		const dest = join(ASSETS_DIR, fn);
		if (await copyImage(src, dest, dryRun)) {
			copied.push(fn);
			if (!dryRun) {
				console.log(`  Image: ${fn}`);
			}
		} else {
			console.warn(`  Image not found: ${src}`);
		}
	}
	return copied;
}

// ─── Hero Image Path Resolution ──────────────────────────────────────────────
function resolveHeroImagePath(
	heroImage: unknown,
	copiedFilenames: string[],
): string | undefined {
	if (!heroImage || typeof heroImage !== 'string') {
		return undefined;
	}
	const fn = extractFilename(heroImage);
	if (copiedFilenames.includes(fn)) {
		return `../../assets/${fn}`;
	}
	return heroImage;
}

// ─── Validation ──────────────────────────────────────────────────────────────
function validatePost(data: Record<string, unknown>, slug: string): boolean {
	if (!data.title) {
		console.error(`  Skipped (missing title): ${slug}`);
		return false;
	}
	if (!data.pubDate) {
		console.error(`  Skipped (missing pubDate): ${slug}`);
		return false;
	}
	if (!data.description) {
		console.error(`  Skipped (missing description): ${slug}`);
		return false;
	}
	return true;
}

// ─── Output Frontmatter (schema-compatible) ──────────────────────────────────
function buildFrontmatter(
	data: Record<string, unknown>,
	heroImage: string | undefined,
): Record<string, unknown> {
	const out: Record<string, unknown> = {
		title: data.title,
		description: data.description,
		pubDate: data.pubDate,
	};
	if (data.updatedDate) {
		out.updatedDate = data.updatedDate;
	}
	if (heroImage) {
		out.heroImage = heroImage;
	}
	return out;
}

// ─── Parse Post ──────────────────────────────────────────────────────────────
async function parsePost(
	vaultPath: string,
	vaultAssetsDir: string,
	file: string,
	includeDrafts: boolean,
	dryRun: boolean,
): Promise<ParsedPost | undefined> {
	const slug = deriveSlug(file);
	const filePath = join(vaultPath, file);

	let raw = '';
	try {
		raw = await readFile(filePath, 'utf8');
	} catch (error) {
		console.error(`  Cannot read ${file}:`, (error as Error).message);
		return undefined;
	}

	const parsed = matter(raw);
	const data = parsed.data as Record<string, unknown>;
	let body = parsed.content;

	if (data.draft === true && !includeDrafts) {
		console.log(`  Draft, skipping (use --include-drafts)`);
		return undefined;
	}

	if (!validatePost(data, slug)) {
		return undefined;
	}

	const { body: convBody, images } = convertObsidian(body);
	body = convBody;
	const bodyImages = images;

	const heroImageRaw = data.heroImage;
	const heroImageFilename = typeof heroImageRaw === 'string'
		? extractFilename(heroImageRaw)
		: undefined;

	return { slug, data, body, bodyImages, heroImageFilename };
}

// ─── Git ─────────────────────────────────────────────────────────────────────
async function doGitCommit(
	posts: ProcessedPost[],
	copiedImagesAll: string[],
): Promise<void> {
	const git = simpleGit();

	const toStage: string[] = [];
	for (const p of posts) {
		toStage.push(join(BLOG_DIR, `${p.slug}.md`));
	}
	toStage.push(join(PROJECT_ROOT, 'src', 'assets'));

	await git.add(toStage);

	const slugs = posts.map((p) => p.slug).join(', ');
	const msg = `feat(blog): publish ${slugs} [${todayStr()}]`;
	await git.commit(msg);
	console.log(`  Commit: ${msg}`);

	await git.push();
	console.log('  Push');
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
	const { vaultPath, files: specificFiles, dryRun, includeDrafts } = parseCli();

	console.log('\n=== Obsidian → Astro Blog Publisher ===\n');

	const dirs = [
		['Vault', vaultPath],
		['Blog output', BLOG_DIR],
		['Assets', ASSETS_DIR],
	] as const;
	for (const [label, p] of dirs) {
		try {
			await access(p, constants.R_OK);
		} catch {
			console.error(`${label} directory not found: ${p}`);
			process.exit(1);
		}
	}

	let vaultAssetsDir = join(vaultPath, VAULT_ASSETS);
	try {
		await access(vaultAssetsDir, constants.R_OK);
	} catch {
		vaultAssetsDir = vaultPath;
		console.warn(`No assets/ dir — using vault root for images: ${vaultPath}`);
	}

	const allFiles = await readdir(vaultPath);
	const mdFiles = specificFiles.length > 0
		? (() => {
			for (const f of specificFiles) {
				if (!allFiles.includes(f)) {
					console.error(`File not found in vault: ${f}`);
					process.exit(1);
				}
			}
			return specificFiles;
		})()
		: allFiles.filter((f) => f.endsWith('.md'));
	mdFiles.sort();
	if (mdFiles.length === 0) {
		console.log('No .md files found in vault.');
		process.exit(0);
	}
	console.log(`Found ${mdFiles.length} .md file(s)`);
	if (dryRun) {
		console.log('[DRY-RUN] No files will be written\n');
	}

	const posts: ProcessedPost[] = [];
	let skipped = 0;

	for (const file of mdFiles) {
		const slug = deriveSlug(file);
		console.log(`\n${file} -> ${slug}`);

		const parsed = await parsePost(
			vaultPath,
			vaultAssetsDir,
			file,
			includeDrafts,
			dryRun,
		);
		if (!parsed) {
			skipped++;
			continue;
		}

		const { data, body, bodyImages, heroImageFilename } = parsed;

		const allImgFns = new Set(bodyImages);
		if (heroImageFilename) {
			allImgFns.add(heroImageFilename);
		}

		const copied = await copyImages(vaultAssetsDir, [...allImgFns], dryRun);

		const heroImageOut = heroImageFilename
			? resolveHeroImagePath(heroImageFilename, copied)
			: undefined;

		const outputFm = buildFrontmatter(data, heroImageOut);

		const outputPath = join(BLOG_DIR, `${parsed.slug}.md`);
		const outputBody = matter.stringify(body, outputFm);

		if (dryRun) {
			console.log(`  [DRY-RUN] Would write: ${outputPath}`);
		} else {
			await writeFile(outputPath, outputBody, 'utf8');
			console.log(`  Written: ${outputPath}`);
		}

		posts.push({ slug: parsed.slug, outputFm, body, copiedImages: copied });
	}

	console.log('\n--- Summary ---');
	console.log(`Published: ${posts.length}`);
	if (skipped) {
		console.log(`Skipped/Errors: ${skipped}`);
	}

	if (posts.length === 0) {
		console.log('Nothing to publish.');
		process.exit(0);
	}

	if (!dryRun) {
		console.log('\n--- Git ---');
		const allCopied = posts.flatMap((p) => p.copiedImages);
		await doGitCommit(posts, allCopied);
	} else {
		console.log('\n[DRY-RUN] No git operations executed.');
	}

	console.log('\nDone.');
}

main().catch((error) => {
	console.error('Fatal:', (error as Error).message);
	process.exit(1);
});
