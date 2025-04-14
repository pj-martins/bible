import { Client, QueryResult } from "pg";
import fs from 'fs';
import path from 'path';

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

const cleanText = (input?: string) => {
	if (!input?.replace) return input;
	let replaced = input;
	for (let dc of decodeMap) {
		let regex = new RegExp(dc.orig, 'g');
		replaced = replaced.replace(regex, dc.nw);
	}
	return replaced.replace(/<[^>]*>/g, '').trim();
}

type Book = {
	abbreviation: string;
	name: string;
	chapters: Array<{
		chapter: string;
		verses: Array<{
			verse: string;
			header: boolean;
			text: string;
		}>
	}>
};

(async () => {
	const db = new Client({ host: 'petjak.com', user: 'postgres', password: 'r3c!pe', database: 'bible' });
	await db.connect();
	let curr = await db.query('select * from bibles');
	const versionMap: Array<{ language: string, abbreviation: string, title: string }> = JSON.parse(fs.readFileSync('version-map.json').toString());
	for (const l of fs.readdirSync('books')) {
		for (const v of fs.readdirSync(path.join('books', l))) {
			let bible = curr.rows.find((r) => r.language == l && r.abbreviation == v);
			if (!bible) {
				await db.query(`
insert into bibles (language, abbreviation, title)
select '${l}', '${v}', '${versionMap.find((x) => x.language == l && x.abbreviation == v)?.title}'
`);
				curr = await db.query('select * from bibles');
				bible = curr.rows.find((r) => r.language == l && r.abbreviation == v);
			}

			let books = await db.query(`select * from books where bible_id = ${bible.bible_id}`);

			for (const b of fs.readdirSync(path.join('books', l, v))) {
				const content: Book = JSON.parse(fs.readFileSync(path.join('books', l, v, b)).toString());
				const ind = +b.split('_')[2];
				let book = books.rows.find((b) => b.abbreviation == content.abbreviation);
				if (!book) {
					await db.query(`
						insert into books (bible_id, abbreviation, book_name, order_index)
						select ${bible.bible_id}, '${content.abbreviation}', '${content.name}', ${ind}
					`);
					books = await db.query(`select * from books where bible_id = ${bible.bible_id}`);
					book = books.rows.find((b) => b.abbreviation == content.abbreviation);
				}

				const currVerses = await db.query(
					`select * from verses where book_id = ${book.book_id}`)


				console.log(v, book.abbreviation);
				for (const c of content.chapters) {
					const chapterNumber = +c.chapter.replace(`${content.abbreviation}.`, '').replace('INTRO1', '0');
					const condensedVerses: { [chapter: string]: Array<{ verse: string, header: string | null }> } = {};
					let currVerse = '';
					let previousVerse = '';
					let runningHeader: Array<string> = [];
					for (let i = 0; i < c.verses.length; i++) {
						let verse = c.verses[i];
						if (i == 0 && !verse.text.trim() && !verse.verse) {
							continue;
						}

						if (verse.header) {
							runningHeader.push(verse.text.trim());
							previousVerse = currVerse;
							currVerse = '';
							continue;
						}

						if (verse.verse && verse.verse == previousVerse &&
							condensedVerses[verse.verse]?.some((x) => !!x.header) &&
							runningHeader.length
						) {
							console.warn("MULTIPLE HEADERS");
						} else if (!verse.verse) {
							if (currVerse) {
								verse.verse = currVerse;
							} else if (i < c.verses.length - 2) {
								verse.verse = c.verses[i + 1].verse;
							}

							if (!verse.verse) {
								throw "HERR";
							}
						}
						// if (!currVerse && previousVerse == )
						// let runningHeader: Array<string> = [];
						// while (verse.header) {
						// 	runningHeader.push(verse.text.trim());
						// 	i++;
						// 	// if (i < c.verses.length) {
						// 	// 	verse = c.verses[i];
						// 	// }
						// 	verse = c.verses[i];
						// }

						// if (runningHeader.length) {
						// 	console.log("V:", verse, runningHeader);
						// }

						// if (i >= c.verses.length) {
						// 	break;
						// }

						currVerse = verse.verse;

						// let j = i;
						// while (!verse.verse) {
						// 	if (j == 0) {
						// 		verse.verse = '1';
						// 	} else {
						// 		verse.verse = c.verses[j - 1].verse;
						// 	}
						// 	j--;
						// }

						if (!condensedVerses[verse.verse]) {
							condensedVerses[verse.verse] = []
						}

						condensedVerses[verse.verse].push({
							verse: verse.text.trim(),
							header: runningHeader.length ? runningHeader.join(' ') : null
						});

						runningHeader = [];
					}

					const final = Object.keys(condensedVerses).map((k) => {
						const head = condensedVerses[k].filter(x => !!x.header);
						if (head.length > 1) {
							console.log("HHH:", k, condensedVerses[k]);
							// throw "HERE";
						}
						return {
							verse_numbers: k.split('+').map(x => +x.replace(`${c.chapter}.`, '')),
							verse_text: cleanText(condensedVerses[k].map(t => t.verse).join(' '))?.trim(),
							header_text: head.length ? head.map(x => cleanText(x.header ?? '')).join(', ') : null,
							k,
							c,
						}
					});

					for (const f of final) {
						for (let i = 0; i < f.verse_numbers.length; i++) {
							if (currVerses.rows.some((cv) => cv.chapter_number == chapterNumber && cv.verse_number == f.verse_numbers[i])) {
								continue;
							}
							// 							await db.query(`
							// insert into verses (verse_text, header_text, verse_number, chapter_number, book_id, parent_verse_number)
							// values ($1, $2, $3, $4, $5, $6)`, [
							// 								i == 0 ? f.verse_text : null,
							// 								i == 0 ? f.header_text : null,
							// 								f.verse_numbers[i],
							// 								chapterNumber,
							// 								book.book_id,
							// 								i > 0 ? f.verse_numbers[0] : null
							// 							]);
						}
					}
				}
			}
		}
	}
	await db.end();
	process.exit(1);
})();
