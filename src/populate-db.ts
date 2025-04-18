import { Client } from "pg";
import fs from 'fs';
import path from 'path';
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
	await db.query(`
delete from verses;
ALTER SEQUENCE verse_verse_id_seq RESTART WITH 1;
`);
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


				console.log(b);
				const flattened = book.chapters.map(c => c.verses.map((x) => ({
					verse_text: cleanText(x.contentElements.join('')),
					header_text: !x.header || x.header.trim() == '' ? null : cleanText(x.header),
					verse_numbers: x.verseNumbers,
					chapter_number: c.chapterNumber,
					book_id: dbbook.book_id,
					notes: x.notes
				}))).flat();

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
			}
		}
	}
	await db.end();
	process.exit(1);
})();
