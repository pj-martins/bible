import { Client, QueryResult } from "pg";
import fs from 'fs';
import { parse, HTMLElement } from 'node-html-parser';
import path from 'path';
import assert from "assert";
import { cleanText } from "./utils";

type Book = {
	languageAbbreviation: string;
	versionAbbreviation: string;
	versionName: string;
	bookAbbreviation: string;
	bookName: string;
	bookIndex: number;
	chapters: Array<Chapter>;
}

type Chapter = {
	chapterNumber: number;
	verses: Array<Verse>;
}

type Verse = {
	verseNumbers: Array<number>;
	contentElements: Array<string>;
	notes: Array<string>;
	header: string | null;
}

(async () => {
	const db = new Client({ host: 'petjak.com', user: 'postgres', password: 'r3c!pe', database: 'bible' });
	await db.connect();
	let curr = await db.query('select * from bibles');
	const versionMap: Array<{ language: string, abbreviation: string, title: string }> = JSON.parse(fs.readFileSync('version-map.json').toString());
	for (const l of fs.readdirSync('books_out')) {
		for (const v of fs.readdirSync(path.join('books_out', l))) {
			let bible = curr.rows.find((r) => r.language == l && r.abbreviation == v);
			if (!bible) {
				await db.query(`
			insert into bibles (language, abbreviation, title)
			select '${l}', '${v}', '${versionMap.find((x) => x.language == l && x.abbreviation == v)?.title}'
			`);
				curr = await db.query('select * from bibles');
				bible = curr.rows.find((r) => r.language == l && r.abbreviation == v);
			}

			let dbbooks = await db.query(`select * from books where bible_id = ${bible.bible_id}`);
			for (const b of fs.readdirSync(path.join('books_out', l, v))) {
				const book: Book = JSON.parse(fs.readFileSync(path.join('books_out', l, v, b)).toString());
				let dbbook = dbbooks.rows.find((b) => b.abbreviation == book.bookAbbreviation);
				if (!dbbook) {
					await db.query(`
						insert into books (bible_id, abbreviation, book_name, order_index)
						select ${bible.bible_id}, '${book.bookAbbreviation}', '${book.bookName}', ${book.bookIndex}
					`);
					dbbooks = await db.query(`select * from books where bible_id = ${bible.bible_id}`);
					dbbook = dbbooks.rows.find((b) => b.abbreviation == book.bookAbbreviation);
				}

				const cnt = await db.query(`select count(*) from verses where book_id = ${dbbook.book_id}`);
				if (cnt.rows[0].count > 0) {
					continue;
				}


				// const currVerses = await db.query(
				// 	`select * from verses where book_id = ${dbbook.book_id}`)

				for (const chapter of book.chapters) {
					console.log(b, chapter.chapterNumber);
					const flattened = chapter.verses.map((x) => ({
						verse_text: cleanText(x.contentElements.map((e) => e.trim()).join(' ')),
						header_text: !x.header || x.header.trim() == '' ? null : cleanText(x.header),
						verse_numbers: x.verseNumbers,
						chapter_number: chapter.chapterNumber,
						book_id: dbbook.book_id,
						notes: x.notes
					}));

					const sql = `
insert into verses (verse_numbers, verse_text, header_text, book_id, chapter_number, notes)
select 
	replace(replace((data ->> 'verse_numbers'), '[', '{'), ']', '}')::int[] as verse_numbers,
	(data ->> 'verse_text')::text as verse_text,
	(data ->> 'header_text')::text as header_text,
	(data ->> 'book_id')::int as book_id,
	(data ->> 'chapter_number')::int as chapter_number,
	replace(replace((data ->> 'notes'), '[', '{'), ']', '}')::text[] as notes
from jsonb_array_elements('${JSON.stringify(flattened).replace(/'/g, `''`)}'::jsonb) as item(data)
						`.trim();
					fs.writeFileSync('temp.sql', sql);
					await db.query(sql)


					// 	// for (const v of chapter.verses) {
					// 	// 	if (currVerses.rows.some((x) => x.verse_numbers.every((y) => v.verseNumbers.includes(y)))) {
					// 	// 		continue;
					// 	// 	}
					// 	// 	await db.query(`
					// 	// 		insert into verses (verse_text, header_text, verse_numbers, chapter_number, book_id, notes)
					// 	// 		values ($1, $2, $3, $4, $5, $6)`, [
					// 	// 		v.contentElements.map((e) => e.trim()).join(' '),
					// 	// 		v.header?.trim() == '' ? null : v.header,
					// 	// 		v.verseNumbers,
					// 	// 		chapter.chapterNumber,
					// 	// 		dbbook.book_id,
					// 	// 		v.notes
					// 	// 	]);
					// 	// }
				}

				// console.log(b);

			}
		}
	}
	await db.end();
	process.exit(1);
})();
