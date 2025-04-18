import { Client } from "pg";

(async () => {
    const db = new Client({ host: 'petjak.com', user: 'postgres', password: 'r3c!pe', database: 'bible' });
    await db.connect();
    const result = await db.query(`
select lower(verse_text) as verse_text, new_testament, book_name
from bible_view
where bible_abbreviation = '${process.argv[2]}'
and lower(verse_text) like '%${process.argv[3]}%'`);
    const wordsAll = result.rows.map(r => ({
        book_name: r.book_name,
        new_testament: r.new_testament,
        word_count: r.verse_text.split(' ').filter(x => x.match(/([a-z]*)/)[1] == process.argv[3]).length
    })).filter((x) => x.word_count > 0);
    const words: Array<{
        book_name: string;
        new_testament: string;
        word_count: number;
    }> = [];
    for (const a of wordsAll) {
        let curr = words.find((w) => w.book_name == a.book_name);
        if (!curr) {
            curr = {
                book_name: a.book_name,
                new_testament: a.new_testament,
                word_count: 0
            };
            words.push(curr);
        }
        curr.word_count += a.word_count;
    }
    await db.end();
    console.log("WC:", words, words.map((w) => w.word_count).reduce((a, b) => a + b, 0));
    process.exit(1);
})();