export interface CompareInput {
    bible_ids: Array<number>;
    book_abbreviation: string;
    chapter_number: number;
    verse_numbers: number[];
}

export interface CompareOutput {
    verse_id: number;
    verse_text: string;
    chapter_number: number;
    book_id: number;
    header_text: string;
    notes: Array<string>;
    verse_numbers: Array<number>;
    bible_id: number;
    book_name: string;
    order_index: number;
    title: string;
    bible_abbreviation: string;
    book_abbreviation: string;
}

export interface Bible {
    bible_id: number;
    abbreviation: string;
    title: string;
}

export interface Book {
    abbreviation: string;
    book_name: string;
}

export interface Lookups {
    books: Array<Book>;
    bibles: Array<Bible>;
}