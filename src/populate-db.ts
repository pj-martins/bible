import { Client, QueryResult } from "pg";
import fs from 'fs';
import path from 'path';

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
				const content = JSON.parse(fs.readFileSync(path.join('books', l, v, b)).toString());
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
			}
		}
	}
	await db.end();
	process.exit(1);
})();
