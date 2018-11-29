import debug from 'debug'
import { writeFile } from "fs";
import { JSDOM } from 'jsdom'
import * as path from "path";
import { promisify } from "util";

const countries: Array<Country> = require('world-countries')

const log = debug('emergency-numbers')

const toArray = Array.from;


async function run() {
    log('start')

    const contentDom = await JSDOM.fromURL('https://en.wikipedia.org/wiki/List_of_emergency_telephone_numbers')

    const tables = toArray(contentDom.window.document.querySelectorAll('.wikitable')).filter(node => {
        let tableHeaders = toArray(node.querySelectorAll<HTMLTableHeaderCellElement>('th'));
        return tableHeaders.some(th => /Police/.test(th.innerHTML));
    })
    const headerMatchingRegex = /State|Country|Police|Fire|Ambulance|Notes/;
    const numbers = tables.map(t => {
        const headers = toArray(t.querySelectorAll<HTMLTableHeaderCellElement>('th'))
            .filter(th => headerMatchingRegex.test(th.innerHTML))
            .map(th => ({
                element: th,
                name: headerMatchingRegex.exec(th.innerHTML)![0]!.trim().toLowerCase()
            }))

        return toArray(t.querySelectorAll<HTMLTableRowElement>('tbody>tr')).map(row => {
            const cells = toArray(row.querySelectorAll<HTMLTableCellElement>('td'))
            if (cells.length) {
                const countryName = cells[0].textContent!.trim()
                    .replace(/([tT]he\s+)/g, '')
                let matchedCountries = countries.filter((c) => c.name.common === countryName || c.name.official === countryName);

                if (matchedCountries.length === 0) {
                    matchedCountries = countries.filter((c) => c.name.common.indexOf(countryName) >= 0 || c.name.official.indexOf(countryName) >= 0);
                }

                if (matchedCountries.length === 0) {
                    matchedCountries = countries.filter((c) => c.altSpellings.some(s => s.indexOf(countryName) >= 0));
                }

                if (matchedCountries.length === 1) {
                    const country = matchedCountries[0]
                    let data;
                    if (cells[1].colSpan === 3) {
                        data = {
                            [headers[1].name]: cells[1].textContent!.trim(),
                            [headers[2].name]: cells[1].textContent!.trim(),
                            [headers[3].name]: cells[1].textContent!.trim(),
                            [headers[4].name]: cells[2].textContent!.trim(),
                        }
                    } else {
                        if (cells[2].colSpan === 2) {
                            data = {
                                [headers[1].name]: cells[1].textContent!.trim(),
                                [headers[2].name]: cells[2].textContent!.trim(),
                                [headers[3].name]: cells[2].textContent!.trim(),
                                [headers[4].name]: cells[3].textContent!.trim(),
                            }
                        } else {
                            data = {
                                [headers[1].name]: cells[1].textContent!.trim(),
                                [headers[2].name]: cells[2].textContent!.trim(),
                                [headers[3].name]: cells[3].textContent!.trim(),
                                [headers[4].name]: cells[4].textContent!.trim(),
                            }
                        }
                    }

                    const dataForCountry = {
                        alpha2: country.cca2,
                        police: data.police,
                        fire: data.fire,
                        medical: data.ambulance,
                        notes: data.notes
                    };
                    log('data for', countryName, dataForCountry)
                    return dataForCountry
                } else {
                    log('Cannot determine country for name', countryName, 'matched', matchedCountries)
                    return null;
                }
            }
            return null;
        }).filter(notNull)
    })

    const allNumbers: Array<{ alpha2: string, police: string, fire: string, medical: string, notes: string }> = [].concat.apply([], numbers)

    function extractNumber(value: string | null) {
        if (!value) {
            return null;
        }

        return value.split(/\s/)
            .map(s => s.replace(/\[\d+\]/g, ''))
            .map(s => s.trim())
            .filter(s => /^\d+$/.test(s))
            .map(val => {
                return val;
            })[0] || value
    }

    const numbersOnly = allNumbers.map(data => ({
        alpha2: data.alpha2,
        police: extractNumber(data.police),
        medical: extractNumber(data.medical),
        fire: extractNumber(data.fire),
    }))

    const byAlpha2 = numbersOnly.reduce((acc, cur) => {
        const { alpha2, ...rest } = cur;
        return Object.assign(acc, { [alpha2]: rest });
    }, {})

    await promisify(writeFile)(path.join(process.cwd(), 'byAlpha2.json'), JSON.stringify(byAlpha2), 'utf-8')
}


run().catch((err) => {
    console.error(err);
    process.exit(1)
});

function notNull<T>(arg: T | null): arg is T {
    return arg !== null;
}

const sampleCountryForTyping = {
    "name": {
        "common": "Aruba",
        "official": "Aruba",
        "native": {
            "nld": {
                "official": "Aruba",
                "common": "Aruba"
            },
            "pap": {
                "official": "Aruba",
                "common": "Aruba"
            }
        }
    },
    "tld": [".aw"],
    "cca2": "AW",
    "ccn3": "533",
    "cca3": "ABW",
    "cioc": "ARU",
    "independent": false,
    "status": "officially-assigned",
    "currency": ["AWG"],
    "callingCode": ["297"],
    "capital": ["Oranjestad"],
    "altSpellings": ["AW"],
    "region": "Americas",
    "subregion": "Caribbean",
    "languages": {
        "nld": "Dutch",
        "pap": "Papiamento"
    },
    "translations": {
        "deu": { "official": "Aruba", "common": "Aruba" },
        "fra": { "official": "Aruba", "common": "Aruba" },
        "hrv": { "official": "Aruba", "common": "Aruba" },
        "ita": { "official": "Aruba", "common": "Aruba" },
        "jpn": { "official": "\u30a2\u30eb\u30d0", "common": "\u30a2\u30eb\u30d0" },
        "nld": { "official": "Aruba", "common": "Aruba" },
        "por": { "official": "Aruba", "common": "Aruba" },
        "rus": { "official": "\u0410\u0440\u0443\u0431\u0430", "common": "\u0410\u0440\u0443\u0431\u0430" },
        "slk": { "official": "Aruba", "common": "Aruba" },
        "spa": { "official": "Aruba", "common": "Aruba" },
        "fin": { "official": "Aruba", "common": "Aruba" },
        "est": { "official": "Aruba", "common": "Aruba" },
        "zho": { "official": "\u963F\u9C81\u5DF4", "common": "\u963F\u9C81\u5DF4" }
    },
    "latlng": [12.5, -69.96666666],
    "demonym": "Aruban",
    "landlocked": false,
    "borders": [],
    "area": 180,
    "flag": "\ud83c\udde6\ud83c\uddfc"
};

type Country = typeof sampleCountryForTyping;
