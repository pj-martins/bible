import fs from 'fs';
import { parse, HTMLElement } from 'node-html-parser';
import path from 'path';
import assert from "assert";
import { cleanText } from './utils';

type RawBook = {
	abbreviation: string;
	name: string;
	chapters: Array<{
		chapter: string;
		html_content: string;
	}>
};

type Chapter = {
	chapterNumber: number;
	verses: Array<Verse>;
}

type RunningHeader = {
	headers: string[];
	notes: string[]
}

type Verse = {
	verseNumbers: Array<number>;
	contentElements: Array<string>;
	notes: Array<string>;
	header: string | null;
}

const isHeaderElement = (el: HTMLElement) => {
	const els = ['ms1', 'mr', 'qa', 'cl']
	return els.includes(el.classNames) ||
		el.classNames.match(/s[0-9]?/)
		;
}

const isContentElement = (el: HTMLElement) => {
	const els = ['nb', 'd', 'iex', 'ie'];
	return els.includes(el.classNames) ||
		el.classNames.match(/m[a-z]*/) ||
		el.classNames.match(/p[a-z]*/) ||
		el.classNames.match(/q[0-9a-z]?/) ||
		el.classNames.match(/pi[0-9]?/) ||
		el.classNames.match(/li[0-9]/)
		;
}

const isInNote = (el: HTMLElement) => {
	if (el.classNames.startsWith('note ')) {
		return true;
	}
	if (el.parentNode != null) {
		return isInNote(el.parentNode);
	}
	return false;
}

const isInContent = (el: HTMLElement) => {
	if (el.classNames === 'content') {
		return true;
	}
	if (el.parentNode != null) {
		return isInContent(el.parentNode);
	}
	return false;
}

const processHeaderElement = (el: HTMLElement, message: string): string => {
	const headers = el.querySelectorAll('*').filter((c) => !c.children.length && !!c.innerText.trim())
	assert(headers.some((h) => h.classNames === 'heading', `${message} ${el.classNames}`));
	const nonHeaders = headers.filter(h => h.classNames !== 'heading' && h.classNames !== 'label' && !isInNote(h));
	if (nonHeaders.length) {
		assert.fail(`Non Headers: ${nonHeaders.map(h => `${h.classNames} - ${h.innerText}`).join(', ')} - ${message} ${el.classNames}`);
	}
	return headers.map((h) => cleanText(h.innerText.trim())).join(' ');
}

const parseContentElements = (el: HTMLElement, verse: Verse, message: string) => {
	if (!el.innerText.trim()) {
		if (el.classNames === 'content') {
			verse.contentElements.push("\n");
		}
		return;
	}

	if (el.classNames == 'note f' || el.classNames == 'note x') {
		verse.notes.push(cleanText(el.innerText));
		return;
	}

	if (el.classNames === 'content') {
		verse.contentElements.push(cleanText(el.innerText));
		return;
	}

	if (el.children.length > 0) {
		el.children.map((c) => parseContentElements(c, verse, message)).flat();
		return;
	}

	assert.fail(`No content element found ${message} - ${el.classNames}`);

}

const weirdOnes: Array<string> = [];

const processContentElement = (el: HTMLElement, chapter: Chapter, runningHeader: RunningHeader, message: string) => {
	if (!el.innerText.trim()) return;
	const content = el.querySelectorAll('*').filter((c) => !c.children.length && !!c.innerText.trim())
	assert(content.some((c) => isInContent(c)), `${message} ${el.classNames}`);
	const nonContent = content.filter(c => !isInContent(c) && c.classNames !== 'label' && !isInNote(c));
	if (nonContent.length) {
		assert.fail(`Non Content: ${nonContent.map(h => h.classNames).join(', ')} - ${message} ${el.classNames}`);
	}

	let verseNumbers: Array<number> = [];
	for (const c of el.children) {
		if (!c.innerText.trim() && runningHeader.headers.length) {
			continue;
		}

		if (c.classNames.startsWith('verse ')) {
			verseNumbers = c.classNames.replace('verse ', '').split(c.classNames.includes(',') ? ',' : ' ').map(x => +x.replace('v', ''));
			assert(!verseNumbers.some(x => isNaN(x)), `${c.classNames} - ${c.innerText} - ${message}`);
		} else {
			assert(!verseNumbers.length || (verseNumbers.length == 1 && verseNumbers[0] == 0), `${c.classNames} - ${c.innerText} - ${message}`);
			verseNumbers = [0];
		}

		let currentVerse = chapter.verses.find((v) => v.verseNumbers.every((v2) => verseNumbers.includes(v2)));
		if (!currentVerse) {
			currentVerse = {
				verseNumbers,
				contentElements: [],
				notes: runningHeader.notes.map(h => h.trim()),
				header: runningHeader.headers.map(h => h.trim()).join(' ')
			}
			chapter.verses.push(currentVerse);
			runningHeader = { headers: [], notes: [] };
		}

		if (c.classNames == 'content' || c.classNames == 'note f' || c.classNames == 'note x') {
			parseContentElements(c, currentVerse, `${message} ${c.classNames}`);
		} else {
			for (const c2 of c.children) {
				if (c2.classNames == 'label' ||
					(c2.classNames != 'content' && !c2.innerText.trim())) {
					continue;
				}

				const prevCount = currentVerse.contentElements.length;
				parseContentElements(c2, currentVerse, `${message} ${c2.classNames}`);
				const diff = currentVerse.contentElements.length - prevCount;
				if (!['note f', 'note x'].includes(c2.classNames)) {
					assert(diff > 0, `${message} ${c2.classNames}`);
				}
			}
		}
	}
}

const processTableElement = (el: HTMLElement, chapter: Chapter, runningHeader: RunningHeader, message: string) => {
	const children = el.querySelectorAll('td');
	assert(children.length > 0, message);
	for (const c of children) {
		processContentElement(c, chapter, runningHeader, message);
	}
}

const processHeadingNote = (el: HTMLElement, message: string) => {
	const headers = el.querySelectorAll('*').filter((c) => !c.children.length && !!c.innerText.trim())
	assert(headers.some((h) => h.classNames === 'heading'), `${message} ${el.classNames}`);
	return headers.map((h) => cleanText(h.innerText.trim())).join(' ');
}

const processTableOfContents = (el: HTMLElement, chapter: Chapter, message: string) => {
	assert(el.children.every((c) => c.classNames === 'content'));
	assert.equal(0, chapter.chapterNumber, message);
	assert.equal(1, chapter.verses.length);
	assert(chapter.verses[0].verseNumbers[0] == 0);
	const tocText = el.children.map((c) => cleanText(c.innerText.trim())).filter((x) => !!x);
	chapter.verses[0].contentElements.push(...tocText);
}

(async () => {
	const versionMap: Array<{ language: string, abbreviation: string, title: string }> = JSON.parse(fs.readFileSync('version-map.json').toString());
	for (const l of fs.readdirSync('books_in')) {
		for (const v of fs.readdirSync(path.join('books_in', l))) {
			for (const b of fs.readdirSync(path.join('books_in', l, v))) {
				const content: RawBook = JSON.parse(fs.readFileSync(path.join('books_in', l, v, b)).toString());
				const ind = +b.split('_')[2];

				console.log(b);
				const chapters: Array<Chapter> = [];
				for (const chapt of content.chapters) {
					const chapterNumber = +chapt.chapter.replace(`${content.abbreviation}.`, '').replace('INTRO1', '0');
					const parsed = parse(chapt.html_content.replace(/\n/g, ''));
					const chaptNode = parsed.children[0].children[0].children[0];
					assert.equal(chaptNode.classNames.replace('chapter ch', '').replace('INTRO1', '0'), chapterNumber);

					const chapter: Chapter = {
						chapterNumber,
						verses: []
					};

					chapters.push(chapter);

					let runningHeader: {
						headers: Array<string>;
						notes: Array<string>;
					} = {
						headers: [],
						notes: []
					};

					// iterate verses
					for (let i = 0; i < chaptNode.children.length; i++) {
						const el = chaptNode.children[i];
						if (i == 0) {
							if (!["label", "imt"].includes(el.classNames)) {
								assert.fail(`First node mismatch ${el.classNames} in ${l} ${v} ${b}`);
							}
							continue;
						}
						if (isHeaderElement(el)) {
							runningHeader.headers.push(processHeaderElement(el, `${b} ${chapt.chapter}`));
						} else if (isContentElement(el)) {
							processContentElement(el, chapter, runningHeader, `${b} ${chapt.chapter}`);
							runningHeader = {
								headers: [],
								notes: []
							};
						} else if (el.classNames == 'table') {
							weirdOnes.push(`Table: ${b} ${chapt.chapter} - ${el.innerText}`);
							processTableElement(el, chapter, runningHeader, `${b} ${chapt.chapter}`);
							runningHeader = {
								headers: [],
								notes: []
							};
						} else if (el.classNames == 'b') {
							assert.equal(el.innerText.trim(), '');
							const last = chapter.verses[chapter.verses.length - 1];
							if (last) {
								last.contentElements.push('\n');
							}
						} else if (el.classNames == 'r') {
							runningHeader.notes.push(processHeadingNote(el, `${b} ${chapt.chapter}`));
						} else if (el.classNames.match(/io[0-9a-z]/)) {
							if (chapter.chapterNumber != 0) {
								weirdOnes.push(`Table contents: ${b} ${chapt.chapter} - ${el.innerText}`);
							}
							processTableOfContents(el, chapter, `${b} ${chapt.chapter}`);
						} else {
							assert.fail(`Unknown ${el.classNames} ${b} ${chapt.chapter}`);
						}
					}

					const verseNumbers = chapter.verses.map((v) => v.verseNumbers).flat();
					const maxNum = Math.max(...verseNumbers);
					for (let i = 1; i <= maxNum; i++) {
						if (!verseNumbers.includes(i)) {
							weirdOnes.push(`Missing verse: ${b} ${chapterNumber} - ${i} -${verseNumbers.join(',')}`);
						}
					}
				}

				const langPath = path.join('books_out', l);
				if (!fs.existsSync(langPath)) {
					fs.mkdirSync(langPath);
				}

				const versionDir = path.join(langPath, v);
				if (!fs.existsSync(versionDir)) {
					fs.mkdirSync(versionDir);
				}

				fs.writeFileSync(path.join(versionDir, `${l}_${v}_${ind}_${content.abbreviation}.json`), JSON.stringify({
					languageAbbreviation: l,
					versionAbbreviation: v,
					versionName: versionMap.find((x) => x.language == l && x.abbreviation == v)?.title,
					bookAbbreviation: content.abbreviation,
					bookName: content.name,
					bookIndex: ind,
					chapters
				}));
			}
		}
	}
	fs.writeFileSync('weirdones.txt', weirdOnes.join('\n'));
	process.exit(1);
})();
