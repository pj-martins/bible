import axios from "axios";
import { Client, QueryResult } from "pg";
import { parse } from 'node-html-parser';
import fs from 'fs';
import path from 'path';

(async () => {
    const db = new Client({ host: 'petjak.com', user: 'postgres', password: 'r3c!pe', database: 'postgres' })
    const baseUrl = 'https://www.bible.com';
    for (const l of ['eng', 'afr']) {
        if (!fs.existsSync(l)) {
            fs.mkdirSync(l);
        }
        let res = await axios.get(`${baseUrl}/api/bible/versions?language_tag=${l}&type=all`);
        for (const v of res.data.response.data.versions) {
		console.log("V:", v);
		continue;
//	      console.log(v.abbreviation);
//            if (l == "eng") {
                if (!['NIV11', 'ESV', 'ASV', 'AMP', 'CEV', 'GNT', 'KJV', 'MSG', 'NET', 'NKJV', 'NLT', 'ABA', 'AFR20', 'AFR53', 'AFR83', 'CAB23'].includes(v.abbreviation)) {
		    continue;
                }
  //          }
            if (!fs.existsSync(path.join(l, v.abbreviation))) {
                fs.mkdirSync(path.join(l, v.abbreviation));
            }
            const books = await axios.get(`${baseUrl}/api/bible/version/${v.id}`);
//            console.log("B:", books);
            let i = 1;
            for (const b of books.data.books) {
                const fileName = path.join(l, v.abbreviation, `${l}_${v.abbreviation}_${i++}_${b.usfm}.json`);
                if (fs.existsSync(fileName)) continue;
                const currBook: any = {
                    abbreviation: b.usfm,
                    name: b.human,
                    chapters: [],
                    language: l,
                };
                // curr.books.push(currBook);
                for (const c of b.chapters) {
                    const url = `${baseUrl}/_next/data/odPN62GeIjyJdC15r-ASU/en/bible/${v.id}/${c.usfm}.${v.abbreviation}.json?versionId=${v.id}&usfm=${c.usfm}.${v.abbreviation}`;
                    const verses = await axios.get(url)
                    const parsed = parse(verses.data.pageProps.chapterInfo.content)
                    console.log(v.abbreviation, c.usfm, parsed.querySelectorAll(`span[class='content']`)[1].innerText);
                    currBook.chapters.push({
                        chapter: c.usfm,
                        texts: parsed.querySelectorAll(`span[class='content']`).map(x => x.innerText)
                    });
                }
                fs.writeFileSync(fileName, JSON.stringify(currBook));
            }

        }
    }
    process.exit(1);
})();
