// import { Client } from "pg";
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

// const SUPPORTED = [
// 	"ABA", "AFR20", "AFR83", "CAB23", "ASV"
// ]

(async () => {
	// 	const db = new Client({ host: 'petjak.com', user: 'postgres', password: 'r3c!pe', database: 'bible' });
	// 	await db.connect();
	// 	await db.query(`
	// delete from verses;
	// ALTER SEQUENCE verse_verse_id_seq RESTART WITH 1;
	// `);
	if (fs.existsSync('./bibles.db')) {
		fs.rmSync('./bibles.db');
	}
	const db = await open({
		filename: './bibles.db',
		driver: sqlite3.Database,
	});
	await db.exec('CREATE TABLE bibles (bible_id INTEGER PRIMARY KEY, language TEXT, abbreviation TEXT, title TEXT)');
	await db.exec('CREATE TABLE books (book_id INTEGER PRIMARY KEY, bible_id INTEGER, abbreviation TEXT, book_name TEXT, order_index INTEGER)');
	await db.exec('CREATE TABLE verses (verse_id INTEGER PRIMARY KEY, book_id INTEGER, verse_number_start INTEGER, verse_number_end INTEGER, verse_text TEXT, header_text TEXT, chapter_number INTEGER, notes TEXT)');
	let curr: Array<{ bible_id: number; language: string; abbreviation: string; }> = []; // await db.query('select * from bibles');

	const versionMap: Array<{ language: string, abbreviation: string, title: string }> = JSON.parse(fs.readFileSync('version-map.json').toString());
	for (const l of fs.readdirSync('books_out')) {
		for (const v of fs.readdirSync(path.join('books_out', l))) {
			let bible = curr.find((r) => r.language == l && r.abbreviation == v);
			if (!bible) {
				await db.exec(`
			insert into bibles (language, abbreviation, title)
			select '${l}', '${v}', '${versionMap.find((x) => x.language == l && x.abbreviation == v)?.title}'
			`);
				curr = await db.all('select * from bibles');
				bible = curr.find((r) => r.language == l && r.abbreviation == v);

				if (!bible) {
					throw "ERROR";
				}
			}

			let dbbooks = await db.all(`select * from books where bible_id = ${bible.bible_id}`);
			for (const b of fs.readdirSync(path.join('books_out', l, v))) {
				const book: Book = JSON.parse(fs.readFileSync(path.join('books_out', l, v, b)).toString());
				let dbbook = dbbooks.find((b) => b.abbreviation == book.bookAbbreviation);
				if (!dbbook) {
					await db.exec(`
						insert into books (bible_id, abbreviation, book_name, order_index)
						select ${bible.bible_id}, '${book.bookAbbreviation}', '${book.bookName}', ${book.bookIndex}
					`);
					dbbooks = await db.all(`select * from books where bible_id = ${bible.bible_id}`);
					dbbook = dbbooks.find((b) => b.abbreviation == book.bookAbbreviation);
				}

				const cnt = await db.all(`select count(*) from verses where book_id = ${dbbook.book_id}`);
				if (cnt[0].count > 0) {
					continue;
				}


				console.log(b);
				const flattened = book.chapters.map(c => c.verses.map((x) => ({
					verse_text: cleanText(x.contentElements.join(' ')),
					header_text: !x.header || x.header.trim() == '' ? null : cleanText(x.header),
					// verse_numbers: x.verseNumbers,
					verse_number_start: Math.min(...x.verseNumbers),
					verse_number_end: Math.max(...x.verseNumbers),
					chapter_number: c.chapterNumber,
					book_id: dbbook.book_id,
					// notes: x.notes
					notes: x.notes.length ? x.notes.join('\n\n') : null,
				}))).flat();

				// 				const sql = `
				// insert into verses (verse_numbers, verse_text, header_text, book_id, chapter_number, notes)
				// select 
				// 	replace(replace((data ->> 'verse_numbers'), '[', '{'), ']', '}')::int[] as verse_numbers,
				// 	(data ->> 'verse_text')::text as verse_text,
				// 	(data ->> 'header_text')::text as header_text,
				// 	(data ->> 'book_id')::int as book_id,
				// 	(data ->> 'chapter_number')::int as chapter_number,
				// 	replace(replace((data ->> 'notes'), '[', '{'), ']', '}')::text[] as notes
				// from jsonb_array_elements('${JSON.stringify(flattened).replace(/'/g, `''`)}'::jsonb) as item(data)
				// 						`.trim();
				const sql = `
insert into verses (verse_number_start, verse_number_end, verse_text, header_text, book_id, chapter_number, notes)
select 
	value ->> 'verse_number_start' as verse_number_start,
	value ->> 'verse_number_end' as verse_number_end,
	value ->> 'verse_text' as verse_text,
	value ->> 'header_text' as header_text,
	value ->> 'book_id' as book_id,
	value ->> 'chapter_number' as chapter_number,
	value ->> 'notes' as notes
from json_each('${JSON.stringify(flattened).replace(/'/g, `''`)}')
`.trim();
				fs.writeFileSync('temp.sql', sql);
				await db.exec(sql)
				// 				for (const f of flattened) {
				// 					const sql = `
				// insert into verses (verse_number_start, verse_number_end, verse_text, header_text, book_id, chapter_number, notes)
				// select ${f.verse_number_start}, ${f.verse_number_end}, '${f.verse_text.replace(/'/g, `''`)}', ${f.header_text ? `'${f.header_text.replace(/'/g, `''`)}'` : 'null'}, ${f.book_id}, ${f.chapter_number}, ${f.notes?.length ? `'${f.notes.join('\n\n').replace(/'/g, `''`)}'` : 'null'}
				// `;
				// 					await db.exec(sql);
				// 				}
			}
		}
	}
	await db.close();
	process.exit(1);
})();
