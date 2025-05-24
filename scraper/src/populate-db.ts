import { Client } from "pg";
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
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
		const dbpg = new Client({ host: 'petjak.com', user: 'postgres', password: 'r3c!pe', database: 'bible' });
		await dbpg.connect();
		await dbpg.query(`
	delete from verses;
	ALTER SEQUENCE verse_verse_id_seq RESTART WITH 1;
	`);
	if (fs.existsSync('./bibles.db')) {
		fs.rmSync('./bibles.db');
	}
	const dbsql = await open({
		filename: './bibles.db',
		driver: sqlite3.Database,
	});
	await dbsql.exec('CREATE TABLE bibles (bible_id INTEGER PRIMARY KEY, language TEXT, abbreviation TEXT, title TEXT)');
	await dbsql.exec('CREATE TABLE books (book_id INTEGER PRIMARY KEY, bible_id INTEGER, abbreviation TEXT, book_name TEXT, order_index INTEGER)');
	await dbsql.exec('CREATE TABLE verses (verse_id INTEGER PRIMARY KEY, book_id INTEGER, verse_number_start INTEGER, verse_number_end INTEGER, verse_text TEXT, header_text TEXT, chapter_number INTEGER, notes TEXT)');
	let pgcurr: { rows: Array<{ bible_id: number; language: string; abbreviation: string; }> } = await dbpg.query('select * from bibles');
	let sqlcurr: Array<number> = [];

	const versionMap: Array<{ language: string, abbreviation: string, title: string }> = JSON.parse(fs.readFileSync('version-map.json').toString());
	for (const l of fs.readdirSync('books_out')) {
		for (const v of fs.readdirSync(path.join('books_out', l))) {
			let bible = pgcurr.rows.find((r) => r.language == l && r.abbreviation == v);
			if (!bible) {
				await dbpg.query(`insert into bibles (language, abbreviation, title)
						  select '${l}', '${v}', '${versionMap.find((x) => x.language == l && x.abbreviation == v)?.title}'`);
				pgcurr = await dbpg.query('select * from bibles');
				bible = pgcurr.rows.find((r) => r.language == l && r.abbreviation == v);

				if (!bible) {
					throw "ERROR";
				}
			}

			if (!sqlcurr.includes(bible.bible_id)) {
				await dbsql.exec(`insert into bibles (bible_id, language, abbreviation, title)
						  select ${bible.bible_id}, '${l}', '${v}', '${versionMap.find((x) => x.language == l && x.abbreviation == v)?.title}'`)
				sqlcurr.push(bible.bible_id);
			}

			let dbbooks: { rows: Array<{ book_id: number, bible_id: number, abbreviation: string }> } =
				await dbpg.query(`select * from books where bible_id = ${bible.bible_id}`);
			let sqlbooks: Array<number> = [];
			for (const b of fs.readdirSync(path.join('books_out', l, v))) {
				const book: Book = JSON.parse(fs.readFileSync(path.join('books_out', l, v, b)).toString());
				let dbbook = dbbooks.rows.find((b) => b.abbreviation == book.bookAbbreviation);
				if (!dbbook) {
					await dbpg.query(`
						insert into books (bible_id, abbreviation, book_name, order_index)
						select ${bible.bible_id}, '${book.bookAbbreviation}', '${book.bookName}', ${book.bookIndex}
					`);
					dbbooks = await dbpg.query(`select * from books where bible_id = ${bible.bible_id}`);
					dbbook = dbbooks.rows.find((b) => b.abbreviation == book.bookAbbreviation);

					if (!dbbook) {
						throw "ERROR";
					}
				}

				if (!sqlbooks.includes(dbbook.book_id)) {
					await dbsql.exec(`
						insert into books (book_id, bible_id, abbreviation, book_name, order_index)
						select ${dbbook.book_id}, ${bible.bible_id}, '${book.bookAbbreviation}', '${book.bookName}', ${book.bookIndex}
					`);
				}

				// const cnt = await dbpg.query(`select count(*) from verses where book_id = ${dbbook.book_id}`);
				// if (cnt[0].count > 0) {
				// 	continue;
				// }


				console.log(b);
				const flattened = book.chapters.map(c => c.verses.map((x) => ({
					verse_text: cleanText(x.contentElements.join(' ')),
					header_text: !x.header || x.header.trim() == '' ? null : cleanText(x.header),
					verse_numbers: x.verseNumbers,
					verse_number_start: Math.min(...x.verseNumbers),
					verse_number_end: Math.max(...x.verseNumbers),
					chapter_number: c.chapterNumber,
					book_id: dbbook.book_id,
					notes: x.notes,
					notes_combined: x.notes.length ? x.notes.join('\n\n') : null,
				}))).flat();

				let sql = `
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
				await dbpg.query(sql);

				sql = `
insert into verses (verse_number_start, verse_number_end, verse_text, header_text, book_id, chapter_number, notes)
select 
	value ->> 'verse_number_start' as verse_number_start,
	value ->> 'verse_number_end' as verse_number_end,
	value ->> 'verse_text' as verse_text,
	value ->> 'header_text' as header_text,
	value ->> 'book_id' as book_id,
	value ->> 'chapter_number' as chapter_number,
	value ->> 'notes_combined' as notes
from json_each('${JSON.stringify(flattened).replace(/'/g, `''`)}')
`.trim();
				await dbsql.exec(sql)
			}
		}
	}
	await dbsql.close();
	await dbpg.end();
	process.exit(1);
})();
