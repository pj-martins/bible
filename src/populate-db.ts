import { Client, QueryResult } from "pg";
import fs from 'fs';
import path from 'path';

(async () => {
	for (const l of fs.readdirSync('books')) {
		for (const v of fs.readdirSync(path.join('books', l))) {
			console.log("V:", v);
		}
	}
	process.exit(1);
})();
