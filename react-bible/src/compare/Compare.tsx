import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bible, Book, CompareOutput, Lookups } from '../models';
import '../App.css';
import { Button, Col, Container, Form, Row } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import Multiselect from 'multiselect-react-dropdown';
import '../App.css';

export const Compare = () => {
    const [verses, setVerses] = useState<Record<string, CompareOutput[]>>({});
    const [lookups, setLookups] = useState<Lookups>();
    const [selectedBibles, setSelectedBibles] = useState<Bible[]>([]);
    const [selectedBook, setSelectedBook] = useState<string>('');
    const [selectedVerses, setSelectedVerses] = useState<string>('');
    const [selectedChapter, setSelectedChapter] = useState<string>('');
    useEffect(() => {
        axios.get('http://localhost:3000/api/lookups').then((res: { data: Lookups }) => {
            setLookups(res.data);
        });
    }, []);

    // const bibleText = (b: Bible) => ({ ...b, displayText: `${b.abbreviation}${b.title ? ` - ${b.title}` : ''}`});

    const onBibleSelectedRemoved = (values: Bible[], selectedValue: Bible) => {
        if (selectedValue.bible_id == 0) {
            setSelectedBibles([...lookups?.bibles ?? []]);
        } else {
            setSelectedBibles(values.filter((x) => x.bible_id != 0));
        }
    };

    const retrieveVerses = () => {
        const verseNumbers: Array<number> = [];
        if (selectedVerses.includes('-')) {
            const start = +selectedVerses.split('-')[0];
            const end = +selectedVerses.split('-')[1];
            for (let i = start; i <= end; i++) {
                verseNumbers.push(i);
            }
        } else {
            verseNumbers.push(...selectedVerses.split(',').map((x) => +x));
        }
        axios.post('http://localhost:3000/api/compare', {
            book_abbreviation: selectedBook,
            chapter_number: +selectedChapter,
            verse_numbers: verseNumbers,
            bible_ids: selectedBibles.map((b) => b.bible_id),
        }).then((res: { data: CompareOutput[] }) => {
            const v: Record<string, CompareOutput[]> = {};
            res.data.forEach((x) => {
                if (!v[x.bible_abbreviation]) {
                    v[x.bible_abbreviation] = [];
                }
                v[x.bible_abbreviation].push(x);
            });

            Object.values(v).forEach((co) => {
                co.sort((a, b) => {
                    const minv = Math.min(...a.verse_numbers);
                    const maxv = Math.max(...b.verse_numbers);
                    if (maxv > minv) return -1;
                    if (maxv < minv) return 1;
                    return 0;
                })
            })

            setVerses(v);
        });
    }

    return (
        <Container>
            <Multiselect
                options={[{ bible_id: 0, abbreviation: 'All', title: '' }, ...lookups?.bibles ?? []]}
                selectedValues={selectedBibles}
                displayValue="abbreviation"
                onSelect={onBibleSelectedRemoved}
                onRemove={onBibleSelectedRemoved}
            />
            <Row>
                <Col md={4}>
                    <Form.Select value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)}>
                        <option></option>
                        {lookups?.books.map((b) => (
                            <option key={b.abbreviation} value={b.abbreviation}>{b.book_name}</option>
                        ))}
                    </Form.Select>
                </Col>
                <Col md={4}>
                    <Form.Control value={selectedChapter} onChange={(e) => setSelectedChapter(e.target.value)}></Form.Control>
                </Col>
                <Col md={4}>
                    <Form.Control value={selectedVerses} onChange={(e) => setSelectedVerses(e.target.value)}></Form.Control>
                </Col>
            </Row>
            <Button variant="primary" onClick={() => retrieveVerses()}>Go</Button>
            <br />
            {Object.entries(verses).map(([x, v]) => (
                <Row style={{ borderBottom: '1px solid #ddd', margin: '5px' }}>
                    <Col md={11}>{v.map((o) => (<><span className="verse-numbers">{o.verse_numbers.join(',')}</span> {o.verse_text}&nbsp;</>))}</Col>
                    <Col style={{ width: '200px' }}>{x}</Col>
                </Row>
            ))}
        </Container>
    );
}