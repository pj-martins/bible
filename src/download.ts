import axios from "axios";
import { parse } from 'node-html-parser';
import fs from 'fs';
import path from 'path';

(async () => {
    const baseUrl = 'https://www.bible.com';
    const versionMap: Array<any> = [];
    for (const l of ['eng', 'afr']) {
        const p = path.join('books', l);
        if (!fs.existsSync(p)) {
            fs.mkdirSync(p);
        }
        let res = await axios.get(`${baseUrl}/api/bible/versions?language_tag=${l}&type=all`);
        for (const v of res.data.response.data.versions) {
            versionMap.push({
                language: l,
                abbreviation: v.abbreviation,
                title: v.title
            });
            if (!['NIV11', 'ESV', 'ASV', 'AMP', 'CEV', 'GNT', 'KJV', 'MSG', 'NET', 'NKJV', 'NLT', 'ABA', 'AFR20', 'AFR53', 'AFR83', 'CAB23'].includes(v.abbreviation)) {
                continue;
            }
            if (!fs.existsSync(path.join(p, v.abbreviation))) {
                fs.mkdirSync(path.join(p, v.abbreviation));
            }
            const books = await axios.get(`${baseUrl}/api/bible/version/${v.id}`);
            let i = 1;
            for (const b of books.data.books) {
                console.log(v.abbreviation, b.human);
                const fileName = path.join(p, v.abbreviation, `${l}_${v.abbreviation}_${i++}_${b.usfm}.json`);
                if (fs.existsSync(fileName)) continue;
                const currBook: any = {
                    abbreviation: b.usfm,
                    name: b.human,
                    chapters: [],
                    language: l,
                };
                for (const c of b.chapters) {
                    const url = `${baseUrl}/_next/data/odPN62GeIjyJdC15r-ASU/en/bible/${v.id}/${c.usfm}.${v.abbreviation}.json?versionId=${v.id}&usfm=${c.usfm}.${v.abbreviation}`;
                    const verses = await axios.get(url)
                    // const parsed = parse(verses.data.pageProps.chapterInfo.content);
                    // const mappedVerses = parsed.querySelectorAll(`span[class='content'], span[class='heading']`).map(x => ({
                    //     verse: x.parentNode.getAttribute('data-usfm'),
                    //     text: x.innerText,
                    //     header: x.classNames.includes('heading')
                    // }));
                    
                    currBook.chapters.push({
                        chapter: c.usfm,
                        // verses: mappedVerses.filter(x => !!x.text?.trim()),
                        html_content: verses.data.pageProps.chapterInfo.content, 
                    });
                }
                fs.writeFileSync(fileName, JSON.stringify(currBook));
            }
        }
    }
    // fs.writeFileSync('version-map.json', JSON.stringify(versionMap));
    process.exit(1);
})();
