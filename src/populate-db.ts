import { Client, QueryResult } from "pg";
import fs from 'fs';
import { parse, HTMLElement } from 'node-html-parser';
import path from 'path';
import assert from "assert";

const decodeMap: Array<{ orig: string, nw: string, recipeOnly?: boolean }> = [
	{ orig: '&reg;', nw: '' },
	{ orig: '&trade;', nw: '' },
	{ orig: '&Agrave;', nw: 'À' },
	{ orig: '&Aacute;', nw: 'Á' },
	{ orig: '&Acirc;', nw: 'Â' },
	{ orig: '&Atilde;', nw: 'Ã' },
	{ orig: '&Auml;', nw: 'Ä' },
	{ orig: '&Aring;', nw: 'Å' },
	{ orig: '&agrave;', nw: 'à' },
	{ orig: '&aacute;', nw: 'á' },
	{ orig: '&acirc;', nw: 'â' },
	{ orig: '&atilde;', nw: 'ã' },
	{ orig: '&auml;', nw: 'ä' },
	{ orig: '&aring;', nw: 'å' },
	{ orig: '&AElig;', nw: 'Æ' },
	{ orig: '&aelig;', nw: 'æ' },
	{ orig: '&szlig;', nw: 'ß' },
	{ orig: '&Ccedil;', nw: 'Ç' },
	{ orig: '&ccedil;', nw: 'ç' },
	{ orig: '&Egrave;', nw: 'È' },
	{ orig: '&Eacute;', nw: 'É' },
	{ orig: '&Ecirc;', nw: 'Ê' },
	{ orig: '&#x1f4cb;', nw: '' },
	{ orig: '&Euml;', nw: 'Ë' },
	{ orig: '&egrave;', nw: 'è' },
	{ orig: '&eacute;', nw: 'é' },
	{ orig: '&ecirc;', nw: 'ê' },
	{ orig: '&euml;', nw: 'ë' },
	{ orig: '&#131;', nw: 'ƒ' },
	{ orig: '&Igrave;', nw: 'Ì' },
	{ orig: '&Iacute;', nw: 'Í' },
	{ orig: '&Icirc;', nw: 'Î' },
	{ orig: '&Iuml;', nw: 'Ï' },
	{ orig: '&igrave;', nw: 'ì' },
	{ orig: '&iacute;', nw: 'í' },
	{ orig: '&icirc;', nw: 'î' },
	{ orig: '&iuml;', nw: 'ï' },
	{ orig: '&Ntilde;', nw: 'Ñ' },
	{ orig: '&ntilde;', nw: 'ñ' },
	{ orig: '&Ograve;', nw: 'Ò' },
	{ orig: '&Oacute;', nw: 'Ó' },
	{ orig: '&Ocirc;', nw: 'Ô' },
	{ orig: '&Otilde;', nw: 'Õ' },
	{ orig: '&Ouml;', nw: 'Ö' },
	{ orig: '&ograve;', nw: 'ò' },
	{ orig: '&oacute;', nw: 'ó' },
	{ orig: '&ocirc;', nw: 'ô' },
	{ orig: '&otilde;', nw: 'õ' },
	{ orig: '&ouml;', nw: 'ö' },
	{ orig: '&Oslash;', nw: 'Ø' },
	{ orig: '&oslash;', nw: 'ø' },
	{ orig: '&#140;', nw: 'Œ' },
	{ orig: '&#156;', nw: 'œ' },
	{ orig: '&#138;', nw: 'Š' },
	{ orig: '&#154;', nw: 'š' },
	{ orig: '&Ugrave;', nw: 'Ù' },
	{ orig: '&Uacute;', nw: 'Ú' },
	{ orig: '&Ucirc;', nw: 'Û' },
	{ orig: '&Uuml;', nw: 'Ü' },
	{ orig: '&ugrave;', nw: 'ù' },
	{ orig: '&uacute;', nw: 'ú' },
	{ orig: '&ucirc;', nw: 'û' },
	{ orig: '&uuml;', nw: 'ü' },
	{ orig: '&#181;', nw: 'µ' },
	{ orig: '&#215;', nw: 'x' },
	{ orig: '&Yacute;', nw: 'Ý' },
	{ orig: '&#159;', nw: 'Ÿ' },
	{ orig: '&yacute;', nw: 'ý' },
	{ orig: '&yuml;', nw: 'ÿ' },
	{ orig: '&#32;', nw: ' ' },
	{ orig: '&#x25a2;', nw: '' },
	{ orig: '&#8211;', nw: '-' },
	{ orig: '&#8243;', nw: '"' },
	{ orig: '&#8217;', nw: `''` },
	{ orig: '&#038;', nw: '&' },
	{ orig: '&#039;', nw: `''` },
	{ orig: '&#39;', nw: `''` },
	{ orig: '&#34;', nw: `"` },
	{ orig: '&#43;', nw: `+` },
	{ orig: '&#044;', nw: `,` },
	{ orig: '&#8220;', nw: `"` },
	{ orig: '&#8221;', nw: `"` },
	{ orig: '&#8216;', nw: `''` },
	{ orig: '&quot;', nw: '"' },
	{ orig: '&frasl;', nw: '/' },
	{ orig: '&frac12;', nw: '½' },
	{ orig: '&frac14;', nw: '¼' },
	{ orig: '&frac13;', nw: '⅓' },
	{ orig: '&frac23;', nw: '⅔' },
	{ orig: '&deg;', nw: '°' },
	{ orig: '&#8212;', nw: `-` },
	{ orig: '&#8230;', nw: `...` },
	{ orig: '&#174;', nw: `` },
	{ orig: '&#241;', nw: 'ñ' },
	{ orig: '&frac34;', nw: '¾' },
	{ orig: '&#226;', nw: 'â' },
	{ orig: '&#232;', nw: 'è' },
	{ orig: '&#224;', nw: 'à' },
	{ orig: '&#234;', nw: 'ê' },
	{ orig: '&#233;', nw: 'é' },
	{ orig: '&#227;', nw: 'ã' },
	{ orig: '&#229;', nw: 'å' },
	{ orig: '&#231;', nw: 'ç' },
	{ orig: '&#169;', nw: '"' },
	{ orig: '&amp;', nw: '&' },
	{ orig: '&rdquo;', nw: '”' },
	{ orig: '&bull;', nw: '•' },
	{ orig: '&rsquo;', nw: `''` },
	{ orig: '&ndash;', nw: '-' },
	{ orig: '&nbsp;', nw: ' ' },
	{ orig: '&ldquo;', nw: '“' },
	{ orig: '&#228;', nw: 'ä' },
	{ orig: '&#246;', nw: 'ö' },
	{ orig: '&#248;', nw: 'ø' },
	{ orig: '&#251;', nw: 'û' },
	{ orig: '&#252;', nw: 'ü' },
	{ orig: '&#235;', nw: 'ë' },
	{ orig: '&#201;', nw: 'É' },
	{ orig: '&#211;', nw: 'Ó' },
	{ orig: '&#160;', nw: ' ' },
	{ orig: '&#249;', nw: 'ù' },
	{ orig: '&#225;', nw: 'á' },
	{ orig: '&#250;', nw: 'ú' },
	{ orig: '&#230;', nw: 'æ' },
	{ orig: '&#245;', nw: 'õ' },
	{ orig: '&#243;', nw: 'ó' },
	{ orig: '&#173;', nw: '' },
	{ orig: '&#242;', nw: 'ò' },
	{ orig: '&#244;', nw: 'ô' },
	{ orig: '&#193;', nw: 'Á' },
	{ orig: '&#253;', nw: 'ý' },
	{ orig: '&#237;', nw: 'í' },
	{ orig: '&#239;', nw: 'ï' },
	{ orig: '&#238;', nw: 'î' },
	{ orig: '&#236;', nw: 'ì' },
	{ orig: '&#192;', nw: 'À' },
	{ orig: '&#223;', nw: 'ß' },
	{ orig: '&#240;', nw: 'ð' },
	{ orig: '&#171;', nw: '«' },
	{ orig: '&#187;', nw: '»' },
	{ orig: '&#183;', nw: '' },
	{ orig: '&#8260;', nw: '/' },
	{ orig: '&#189;', nw: '½' },
	{ orig: '&#190;', nw: '¾' },
	{ orig: '&#151;', nw: '-' },
	{ orig: '&#97;', nw: '-' },
	{ orig: '&#8209;', nw: '-' },
	{ orig: '&#x27;', nw: `''` },
	{ orig: '&#188;', nw: '¼' },
	{ orig: '&#186;', nw: 'º' },
	{ orig: '&#176;', nw: '°' },
	{ orig: '&#177;', nw: '±' },
	{ orig: '&#8532;', nw: '⅔' },
	{ orig: '&#8531;', nw: '⅓' },
	{ orig: '&#178;', nw: '²' },
	{ orig: '&#185;', nw: '¹' },
];

const cleanText = (input: string) => {
	let replaced = input;
	for (let dc of decodeMap) {
		let regex = new RegExp(dc.orig, 'g');
		replaced = replaced.replace(regex, dc.nw);
	}
	return replaced.replace(/<[^>]*>/g, '').trim();
}

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
	return headers.map((h) => h.innerText.trim()).join(' ');
}

const parseContentElements = (el: HTMLElement, verse: Verse, message: string) => {
	if (!el.innerText.trim()) {
		return;
	}

	if (el.classNames == 'note f' || el.classNames == 'note x') {
		verse.notes.push(cleanText(el.innerText.trim()));
		return;
	}

	if (el.classNames === 'content') {
		verse.contentElements.push(cleanText(el.innerText.trim()));
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
	let previous: Array<number> = [];
	for (const c of el.children) {
		if (!c.innerText.trim()) {
			continue;
		}

		// if (c.innerText.trim().includes('het Dawid die Amalekiete oorwin en toe het hy teruggekom')) {
		// 	console.log("HERE");
		// }

		// if (verseNumbers.length) {
		// 	assert(previous.every((p) => verseNumbers.includes(p)));
		// } else if (c.classNames.startsWith('verse ')) {
		if (c.classNames.startsWith('verse ')) {
			verseNumbers = c.classNames.replace('verse ', '').split(c.classNames.includes(',') ? ',' : ' ').map(x => +x.replace('v', ''));
			assert(!verseNumbers.some(x => isNaN(x)), `${c.classNames} - ${c.innerText} - ${message}`);
			if (previous.length && !previous.every((p) => verseNumbers.includes(p))) {
				weirdOnes.push(`old verse match logic broken ${message} - ${c.innerHTML}`);
			}
		} else {
			if (chapter.chapterNumber != 0) {
				weirdOnes.push(`No verse numbers: ${c.classNames} - ${message} - ${c.innerText}`);
			}
			verseNumbers = [0];
		}

		previous = verseNumbers;

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
				if (c2.classNames == 'label' || !c2.innerText.trim()) {
					continue;
				}

				const prevCount = currentVerse.contentElements.length;
				parseContentElements(c2, currentVerse, `${message} ${c2.classNames}`);
				const diff = currentVerse.contentElements.length - prevCount;
				if (diff > 1) {
					weirdOnes.push(`More than one el added nested? ${message} ${c2.classNames} - ${c2.innerHTML}`);
				}
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
	return headers.map((h) => h.innerText.trim()).join(' ');
}

const processTableOfContents = (el: HTMLElement, chapter: Chapter, message: string) => {
	assert(el.children.every((c) => c.classNames === 'content'));
	assert.equal(0, chapter.chapterNumber, message);
	assert.equal(1, chapter.verses.length);
	assert(chapter.verses[0].verseNumbers[0] == 0);
	const tocText = el.children.map((c) => c.innerText.trim()).filter((x) => !!x);
	chapter.verses[0].contentElements.push(...tocText);
}

(async () => {
	// const db = new Client({ host: 'petjak.com', user: 'postgres', password: 'r3c!pe', database: 'bible' });
	// await db.connect();
	// let curr = await db.query('select * from bibles');
	const versionMap: Array<{ language: string, abbreviation: string, title: string }> = JSON.parse(fs.readFileSync('version-map.json').toString());
	for (const l of fs.readdirSync('books_in')) {
		for (const v of fs.readdirSync(path.join('books_in', l))) {
			// 			let bible = curr.rows.find((r) => r.language == l && r.abbreviation == v);
			// 			if (!bible) {
			// 				await db.query(`
			// insert into bibles (language, abbreviation, title)
			// select '${l}', '${v}', '${versionMap.find((x) => x.language == l && x.abbreviation == v)?.title}'
			// `);
			// 				curr = await db.query('select * from bibles');
			// 				bible = curr.rows.find((r) => r.language == l && r.abbreviation == v);
			// 			}

			// 			let books = await db.query(`select * from books where bible_id = ${bible.bible_id}`);

			for (const b of fs.readdirSync(path.join('books_in', l, v))) {
				const content: RawBook = JSON.parse(fs.readFileSync(path.join('books_in', l, v, b)).toString());
				const ind = +b.split('_')[2];
				// let book = books.rows.find((b) => b.abbreviation == content.abbreviation);
				// if (!book) {
				// 	await db.query(`
				// 		insert into books (bible_id, abbreviation, book_name, order_index)
				// 		select ${bible.bible_id}, '${content.abbreviation}', '${content.name}', ${ind}
				// 	`);
				// 	books = await db.query(`select * from books where bible_id = ${bible.bible_id}`);
				// 	book = books.rows.find((b) => b.abbreviation == content.abbreviation);
				// }

				// const currVerses = await db.query(
				// 	`select * from verses where book_id = ${book.book_id}`)


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
	// await db.end();
	process.exit(1);
})();
