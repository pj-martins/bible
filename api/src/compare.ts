import { queryDatabase } from "./dbutils";
import { CompareInput, CompareOutput } from "./models";

export const lookups = async () => {
    // TODO:??
    const defaultBook = 'NIV11';

    const books = await queryDatabase(`
select b.abbreviation, book_name
from books b
join bibles bi on bi.bible_id = b.bible_id
where bi.abbreviation = '${defaultBook}'
order by b.order_index`
    );

    const bibles = await queryDatabase(`select bible_id, abbreviation, title from bibles`);
    return {
        books,
        bibles
    };
}

export const compare = async (input: CompareInput): Promise<Array<CompareOutput>> => {
    const qry = `
SELECT 
    *,
    bi.abbreviation as bible_abbreviation,
    b.abbreviation as book_abbreviation
FROM verses v
JOIN books b on b.book_id = v.book_id
JOIN bibles bi on bi.bible_id = b.bible_id
WHERE b.abbreviation = '${input.book_abbreviation}'
${input.bible_ids?.length ? `AND bi.bible_id in (${input.bible_ids.join(',')})` : ''}
AND v.chapter_number = ${input.chapter_number}
AND (${input.verse_numbers.map((x) => `${x} = ANY(v.verse_numbers)`).join(' OR ')})
`;

    const res = await queryDatabase(qry);
    return res.map((x) => ({
        verse_id: x.verse_id,
        verse_text: x.verse_text,
        chapter_number: x.chapter_number,
        book_id: x.book_id,
        header_text: x.header_text,
        notes: x.notes,
        verse_numbers: x.verse_numbers,
        bible_id: x.bible_id,
        book_name: x.book_name,
        order_index: x.order_index,
        title: x.title,
        bible_abbreviation: x.bible_abbreviation,
        book_abbreviation: x.book_abbreviation,
    }));
};
