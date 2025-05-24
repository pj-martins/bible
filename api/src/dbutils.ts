import { Client } from "pg";

export const getDbInstance = async () => {
    const db = new Client({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    await db.connect();
    return db;
}

export const queryDatabase = async (qry: string, values: Array<any> = []) => {
    const db = await getDbInstance();
    const results = await db.query(qry, values);
    await db.end();
    return results.rows;
}